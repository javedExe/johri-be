export const ROLES = Object.freeze({
  OWNER:  'Owner',
  ADMIN:  'Admin',
  VIEWER: 'Viewer'
});

export const SESSION = Object.freeze({
  IDLE_MS:  +process.env.SESSION_IDLE_MS,
  WARN_MS:  +process.env.SESSION_WARN_MS
});
