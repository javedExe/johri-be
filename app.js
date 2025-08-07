import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import morgan       from 'morgan';
import session      from 'express-session';
import pgSession    from 'connect-pg-simple';
import passport     from 'passport';
import rateLimiter  from './src/middlewares/rateLimiter.js';
import logger       from './src/middlewares/logger.js';
import { pool }     from './src/config/database.js';
import './src/config/passport.js';                // registers strategies
import routes       from './src/routes/index.js';
import activity     from './src/middlewares/activityWatcher.js';

const app = express();
const PgStore = pgSession(session);

/* ────── Core middleware stack ────── */
app.use(helmet());

// --- CORS setup ---
// app.use(cors({ origin: true, credentials: true }));
app.options('*', cors({ origin: true, credentials: true }));
const corsOptions = {
  origin: 'http://localhost:5173', // <-- frontend origin
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimiter);

/* ────── Session store ────── */
app.use(session({
  store: new PgStore({
    pool,
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: +process.env.SESSION_IDLE_MS || 86400000,
    secure: false,
    sameSite: 'lax'
  }
}));

/* ────── Passport ────── */
app.use(passport.initialize());
app.use(passport.session());

/* ────── Inactivity watcher ────── */
app.use(activity);

/* ────── Main routes ────── */
app.use('/', routes);

export default app;