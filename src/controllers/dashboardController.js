import userService from '../services/userService.js';
import { pool } from '../config/database.js';
import { logPasswordResetEvent, AUDIT_EVENTS } from '../services/auditService.js';

/* ──────────────────────────────────────────────────────
   MAIN DASHBOARD ENDPOINTS
   ────────────────────────────────────────────────────── */

export const adminHome = async (req, res) => {
  try {
    // Get quick stats for dashboard home
    const statsQuery = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_locked = true) as locked_users,
        (SELECT COUNT(*) FROM password_reset_logs WHERE event_time > NOW() - INTERVAL '24 hours') as recent_resets,
        (SELECT COUNT(*) FROM session) as active_sessions
    `);
    
    const stats = statsQuery.rows[0];
    
    res.json({
      message: 'Welcome, Super Admin!',
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role_id: req.user.role_id
      },
      quickStats: {
        totalUsers: parseInt(stats.total_users),
        lockedUsers: parseInt(stats.locked_users),
        recentPasswordResets: parseInt(stats.recent_resets),
        activeSessions: parseInt(stats.active_sessions)
      },
      lastLogin: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Dashboard home error:', error);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const detailedStats = await pool.query(`
      SELECT 
        -- User statistics
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role_id = 1) as owners,
        (SELECT COUNT(*) FROM users WHERE role_id = 2) as admins,
        (SELECT COUNT(*) FROM users WHERE role_id = 3) as viewers,
        (SELECT COUNT(*) FROM users WHERE is_locked = true) as locked_users,
        (SELECT COUNT(*) FROM users WHERE google_id IS NOT NULL) as google_users,
        
        -- Activity statistics
        (SELECT COUNT(*) FROM password_reset_logs WHERE event_time > NOW() - INTERVAL '24 hours') as password_resets_24h,
        (SELECT COUNT(*) FROM password_reset_logs WHERE event_time > NOW() - INTERVAL '7 days') as password_resets_7d,
        (SELECT COUNT(*) FROM session) as active_sessions,
        
        -- Security statistics
        (SELECT COUNT(*) FROM password_reset_logs WHERE event_type = 'account_locked' AND event_time > NOW() - INTERVAL '24 hours') as lockouts_24h
    `);
    
    const recentActivity = await pool.query(`
      SELECT event_type, COUNT(*) as count, DATE(event_time) as date
      FROM password_reset_logs 
      WHERE event_time > NOW() - INTERVAL '7 days'
      GROUP BY event_type, DATE(event_time)
      ORDER BY date DESC
    `);
    
    res.json({
      statistics: detailedStats.rows[0],
      recentActivity: recentActivity.rows,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to load statistics' });
  }
};

export const getSystemHealth = async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await pool.query('SELECT NOW()');
    const dbStatus = dbCheck.rows.length > 0 ? 'healthy' : 'error';
    
    // Check session store
    const sessionCheck = await pool.query('SELECT COUNT(*) FROM session');
    const sessionStatus = sessionCheck.rows.length >= 0 ? 'healthy' : 'error';
    
    // System uptime (approximate)
    const uptime = process.uptime();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: dbStatus,
          lastCheck: dbCheck.rows[0].now
        },
        sessionStore: {
          status: sessionStatus,
          activeSessions: parseInt(sessionCheck.rows[0].count)
        },
        server: {
          status: 'healthy',
          uptime: `${Math.floor(uptime / 60)} minutes`,
          nodeVersion: process.version
        }
      }
    });
    
  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
};

/* ──────────────────────────────────────────────────────
   USER MANAGEMENT ENDPOINTS
   ────────────────────────────────────────────────────── */

export const getUserManagement = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, locked } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    const params = [];
    
    if (role) {
      whereClause += ` AND r.name = $${params.length + 1}`;
      params.push(role);
    }
    
    if (locked !== undefined) {
      whereClause += ` AND u.is_locked = $${params.length + 1}`;
      params.push(locked === 'true');
    }
    
    const usersQuery = await pool.query(`
      SELECT 
        u.id, u.username, u.email, u.google_id, u.is_locked, 
        u.lockout_expires_at, u.created_at,
        r.name as role_name, r.id as role_id,
        (SELECT COUNT(*) FROM password_reset_logs WHERE user_id = u.id) as reset_count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    const totalQuery = await pool.query(`
      SELECT COUNT(*) FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE ${whereClause}
    `, params);
    
    res.json({
      users: usersQuery.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalQuery.rows[0].count),
        pages: Math.ceil(totalQuery.rows[0].count / limit)
      }
    });
    
  } catch (error) {
    console.error('User management error:', error);
    res.status(500).json({ message: 'Failed to load users' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    
    // Validate role exists
    const roleCheck = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid role ID' });
    }
    
    // Update user role
    await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [roleId, userId]);
    
    // Log the action
    await logPasswordResetEvent(userId, 'role_updated', req, {
      newRoleId: roleId,
      newRoleName: roleCheck.rows[0].name,
      updatedBy: req.user.id
    });
    
    res.json({
      message: 'User role updated successfully',
      newRole: roleCheck.rows[0].name
    });
    
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
};

export const lockUnlockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { locked, duration } = req.body;
    
    if (locked) {
      // Lock user
      const lockoutExpiry = duration ? new Date(Date.now() + duration * 60000) : null;
      await userService.lockUserAccount(userId, lockoutExpiry);
      
      await logPasswordResetEvent(userId, AUDIT_EVENTS.ACCOUNT_LOCKED, req, {
        lockedBy: req.user.id,
        duration: duration || 'indefinite'
      });
      
      res.json({ message: 'User account locked successfully' });
    } else {
      // Unlock user
      await userService.unlockUserAccount(userId);
      
      await logPasswordResetEvent(userId, AUDIT_EVENTS.ACCOUNT_UNLOCKED, req, {
        unlockedBy: req.user.id
      });
      
      res.json({ message: 'User account unlocked successfully' });
    }
    
  } catch (error) {
    console.error('Lock/unlock user error:', error);
    res.status(500).json({ message: 'Failed to update user lock status' });
  }
};

/* ──────────────────────────────────────────────────────
   AUDIT & SECURITY ENDPOINTS
   ────────────────────────────────────────────────────── */

export const getAuditLogs = async (req, res, filters = {}) => {
  try {
    const { page = 1, limit = 20, userId, eventType } = { ...req.query, ...filters };
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    const params = [];
    
    if (userId) {
      whereClause += ` AND l.user_id = $${params.length + 1}`;
      params.push(userId);
    }
    
    if (eventType) {
      whereClause += ` AND l.event_type = $${params.length + 1}`;
      params.push(eventType);
    }
    
    const logsQuery = await pool.query(`
      SELECT 
        l.*, u.username, u.email
      FROM password_reset_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE ${whereClause}
      ORDER BY l.event_time DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    const totalQuery = await pool.query(`
      SELECT COUNT(*) FROM password_reset_logs l WHERE ${whereClause}
    `, params);
    
    res.json({
      logs: logsQuery.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalQuery.rows[0].count),
        pages: Math.ceil(totalQuery.rows[0].count / limit)
      }
    });
    
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ message: 'Failed to load audit logs' });
  }
};
