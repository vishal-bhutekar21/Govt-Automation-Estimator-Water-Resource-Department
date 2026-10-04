import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { db } from './database/db';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import projectRoutes from './routes/projectRoutes';
import caseRoutes from './routes/caseRoutes';
import measurementRoutes from './routes/measurementRoutes';
import rateRoutes from './routes/rateRoutes';
import estimateRoutes from './routes/estimateRoutes';
import depreciationRoutes from './routes/depreciationRoutes';
import salvageRoutes from './routes/salvageRoutes';
import panchanamaRoutes from './routes/panchanamaRoutes';
import pdfReportRoutes from './routes/pdfReportRoutes';
import auditRoutes from './routes/auditRoutes';
import workflowRoutes from './routes/workflowRoutes';

const app: Express = express();
const PORT = process.env.PORT || 5055;

// Kick off DB init immediately; requests wait until ready.
db.init();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));

app.use(async (_req, _res, next) => {
  try {
    await db.waitForInit();
    next();
  } catch (err) {
    next(err);
  }
});

// Flush Postgres/file writes before the response body leaves, so creates/updates
// are durable even when save() is fire-and-forget from controllers.
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    void db
      .flushSaves()
      .catch((err) => console.warn('flushSaves before response failed:', err))
      .finally(() => {
        originalJson(body);
      });
    return res;
  }) as typeof res.json;
  next();
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/cases', caseRoutes);
app.use('/api/v1/cases', measurementRoutes);
app.use('/api/v1/rates', rateRoutes);
app.use('/api/v1/cases', estimateRoutes);
app.use('/api/v1/cases', depreciationRoutes);
app.use('/api/v1/cases', salvageRoutes);
app.use('/api/v1/cases', panchanamaRoutes);
app.use('/api/v1/cases', pdfReportRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/workflow', workflowRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'House Valuation & Estimation Calculation Engine',
    version: '1.1.0',
    storage: db.storageBackend,
    timestamp: new Date().toISOString(),
  });
});

async function start(): Promise<void> {
  await db.waitForInit();
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log(`🏛️  Government House Valuation Engine running on http://localhost:${PORT}`);
      console.log(`💾 Storage backend: ${db.storageBackend}`);
    });
  }
}

void start();

export default app;
