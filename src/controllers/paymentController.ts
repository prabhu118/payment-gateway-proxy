import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { ChargeRequest, ChargeResponse, RiskAssessmentResult, Transaction } from "../types";
import { chargeRequestSchema } from "../utils/validation";
import { generateTransactionId } from "../utils/helpers";
import { RiskAssessmentService } from "../services/riskAssessment";
import { TransactionDataService } from "../services/transactionDataService";

export class PaymentController {

    constructor(
        private riskService: RiskAssessmentService,
        private transactionDataService: TransactionDataService
    ) { }

    async charge(req: Request, res: Response): Promise<void> {
        try {
            let { error, value } = chargeRequestSchema.validate(req.body || {}, { abortEarly: false });

            if (error) {
                res.status(400).json({
                    error: 'Invalid request',
                    message: error.details.map(detail => detail.message)
                });
                return;
            }

            const chargeRequest: ChargeRequest = value;

            const riskAssessment: RiskAssessmentResult = this.riskService.calculateRisk(chargeRequest);

            const transactionId: string = generateTransactionId();

            const chargeResponse: Partial<ChargeResponse> = {
                transactionId,
                riskScore: riskAssessment.score,
            }

            const transactionData: Transaction = {
                id: transactionId,
                timestamp: new Date(),
                request: chargeRequest,
                response: chargeResponse as ChargeResponse,
                metadata: {
                    ipAddress: req.ip,
                }
            }

            this.transactionDataService.storeTransaction(transactionData);

            res.status(200).json({
                message: 'Payment request processed successfully',
                data: chargeResponse
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