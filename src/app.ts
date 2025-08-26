import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { logger } from './utils/logger';
import { PaymentController } from './controllers/paymentController';
import { RiskAssessmentService } from './services/riskAssessment';
import { TransactionDataService } from './services/transactionDataService';


export function createApp() {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(helmet());
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use((req: Request, _res: Response, next: NextFunction) => {
        logger.info(`${req.method} ${req.path}`, { ip: req.ip });
        next();
    });

    const riskService = new RiskAssessmentService();
    const transactionDataService = new TransactionDataService();
    const paymentController = new PaymentController(riskService, transactionDataService);

    // App Routes
    app.post('/charge', (req: Request, res: Response) => paymentController.charge(req, res))
    app.get('/transactions', (_req: Request, _res: Response) => { })
    app.get('/transaction/:id', (_req: Request, _res: Response) => { })

    // 404 handler
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            error: 'Route not found',
            message: `${req.method} ${req.originalUrl} is not supported`
        });
    });

    // Error handler
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        logger.error('Unhandled error', err);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred'
        });
    });

    return app;
}