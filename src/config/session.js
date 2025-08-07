export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: +process.env.SESSION_IDLE_MS
};
export const sessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: cookieOptions
};