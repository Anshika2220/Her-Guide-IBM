import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProd } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';
import applicationRoutes from './routes/applicationRoutes';
import authRoutes from './routes/authRoutes';
import { bizRoutes, careerRoutes } from './routes/careerRoutes';
import documentRoutes from './routes/documentRoutes';
import opportunityRoutes from './routes/opportunityRoutes';
import { dashboardRoutes, profileRoutes } from './routes/profileRoutes';
import publicRoutes from './routes/publicRoutes';
import savedRoutes from './routes/savedRoutes';
import supportRoutes from './routes/supportRoutes';

export const app = express();

app.set('trust proxy', 1); // correct client IPs behind a proxy (rate limiting)
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(isProd ? 'combined' : 'dev')); // morgan logs URLs, not bodies

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/biz', bizRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);
