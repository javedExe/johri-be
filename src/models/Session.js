/**
 * Thin helper around the “session” table that
 * connect-pg-simple creates automatically.
 * Lets you look-up or invalidate sessions from code.
 */
import { pool } from '../config/database.js';

export default {
  bySid: async sid =>
    (await pool.query('SELECT sess, expire FROM session WHERE sid=$1', [sid])).rows[0],

  allForUser: async userId =>
    (await pool.query(`
      SELECT sid, sess, expire
        FROM session
       WHERE (sess -> 'passport' ->> 'user')::int = $1
    `, [userId])).rows,

  destroy: async sid =>
    pool.query('DELETE FROM session WHERE sid=$1', [sid]),

  destroyAllForUser: async userId =>
    pool.query(`
      DELETE FROM session
       WHERE (sess -> 'passport' ->> 'user')::int = $1
    `, [userId])
};
