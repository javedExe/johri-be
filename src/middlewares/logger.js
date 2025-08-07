import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.resolve(__dirname, '../../..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

export const logger = {
  info: (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] INFO: ${typeof message === 'object' ? JSON.stringify(message) : message}\n`;
    console.log(logEntry.trim());
    fs.appendFileSync(logFile, logEntry);
  }
};

export default (req, res, next) => {
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      userId: req.user?.id || null
    });
  });
  next();
};
