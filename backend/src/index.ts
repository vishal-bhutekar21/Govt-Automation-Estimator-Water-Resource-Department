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

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Initialize persistent database
db.init();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Routes
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

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'House Valuation & Estimation Calculation Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🏛️  Government House Valuation Engine running on http://localhost:${PORT}`);
});

export default app;
