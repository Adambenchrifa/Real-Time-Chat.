import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';

dotenv.config();

const app = express();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware setup in exact order:
// 1. helmet() (for security headers)
app.use(helmet());

// 2. compression() (for response compression)
app.use(compression());

// 3. cors() (configured to allow requests from the client origin, use env variable)
app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);

// 4. express.json() (for parsing JSON bodies)
app.use(express.json());

// Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
