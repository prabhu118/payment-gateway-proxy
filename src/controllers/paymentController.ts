import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { ChargeRequest } from "../types";
import { chargeRequestSchema } from "../utils/validation";

export class PaymentController {

    async charge(req: Request, res: Response) {
        try {
            let { error, value } = chargeRequestSchema.validate(req.body || {}, { abortEarly: false });

            if (error) {
                return res.status(400).json({
                    error: 'Invalid request',
                    message: error.details.map(detail => detail.message)
                });
            }

            const chargeRequest: ChargeRequest = value;

            res.status(200).json({
                message: 'Payment request processed successfully',
                data: chargeRequest
            });

        } catch (error) {
            logger.error('Error processing charge', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Unable to process payment request'
            });
        }
    }
}