import express from "express";

import { logger } from './utils/logger';

export function createApp() {
    const app = express();

    app.use(express.json());

    // Request logging
    app.use((req, _res, next) => {
        logger.info(`${req.method} ${req.path}`, { ip: req.ip });
        next();
    });

    app.get("/", (_req, res) => {
        res.send("Hello World");
    });

    return app;
}