import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { ChargeRequest, ChargeResponse, RiskAssessmentResult, Transaction, PaymentProvider, TransactionStatus } from "../types";
import { chargeRequestSchema } from "../utils/validation";
import { generateTransactionId } from "../utils/helpers";
import { RiskAssessmentService } from "../services/riskAssessment";
import { TransactionDataService } from "../services/transactionDataService";
import { PaymentRouterService } from "../services/paymentRouter";
import { GeminiService } from "../services/geminiService";

export class PaymentController {

    constructor(
        private riskService: RiskAssessmentService,
        private transactionDataService: TransactionDataService,
        private paymentRouterService: PaymentRouterService,
        private geminiService: GeminiService
    ) { }

    /**
     * Processes a charge request
     * @param req - The request object
     * @param res - The response object
     * @returns The transaction data
     */
    async charge(req: Request, res: Response): Promise<void> {
        try {
            let { error, value } = chargeRequestSchema.validate(req.body || {}, { abortEarly: false });

            if (error) {

                console.log(error.details.map(detail => detail.message.replace(/\\\"/g, "")))

                res.status(400).json({
                    error: 'Invalid request',
                    message: error.details.map(detail => detail.message.replace(/["\\]/g, ""))
                });
                return;
            }

            const chargeRequest: ChargeRequest = value;

            const riskAssessment: RiskAssessmentResult = this.riskService.calculateRisk(chargeRequest);

            const transactionId: string = generateTransactionId();

            const provider: PaymentProvider | null = this.paymentRouterService.routePayment(riskAssessment.score);

            let status: TransactionStatus = 'blocked';

            if (provider) {
                const paymentSuccess = this.paymentRouterService.simulatePayment(provider);
                status = paymentSuccess ? 'success' : 'error';
            }

            const explanation = await this.geminiService.generateDescriptionFromTags(chargeRequest, riskAssessment.score, provider, status, riskAssessment.triggeredRules);

            const chargeResponse: ChargeResponse = {
                transactionId,
                provider,
                status,
                riskScore: riskAssessment.score,
                explanation
            }

            const transactionData: Transaction = {
                id: transactionId,
                timestamp: new Date(),
                request: chargeRequest,
                response: chargeResponse,
                metadata: {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            }

            this.transactionDataService.storeTransaction(transactionData);

            // Log transaction
            logger.info('Transaction processed', {
                transactionId,
                status,
                riskScore: riskAssessment.score,
                provider,
                amount: chargeRequest.amount,
                triggeredRules: riskAssessment.triggeredRules
            });

            const statusCode = status === 'success' ? 200 : status === 'blocked' ? 403 : 500;
            res.status(statusCode).json(chargeResponse);
        } catch (error) {
            logger.error('Error processing charge', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Unable to process payment request'
            });
        }
    }

    /**
     * Retrieves all transactions
     * @param _req - The request object
     * @param res - The response object
     * @returns The transaction data
     */
    async getTransactions(_req: Request, res: Response): Promise<void> {
        try {
            const transactions = this.transactionDataService.getAllTransactions();
            res.json({
                count: transactions.length,
                transactions
            });
        } catch (error) {
            logger.error('Error retrieving transactions', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Unable to retrieve transactions'
            });
        }
    }

    /**
     * Retrieves a transaction by its ID
     * @param req - The request object
     * @param res - The response object
     * @returns The transaction data
     */
    async getTransaction(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    error: 'Invalid request',
                    message: 'Transaction ID is required'
                });
                return;
            }

            const transaction = this.transactionDataService.getTransactionById(id);

            if (!transaction) {
                res.status(404).json({
                    error: 'Transaction not found',
                    message: `No transaction found with ID: ${id}`
                });
                return;
            }

            res.json(transaction);
        } catch (error) {
            logger.error('Error retrieving transaction', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Unable to retrieve transaction'
            });
        }
    }
}