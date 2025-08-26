import { Request, Response } from 'express';
import { PaymentController } from '../../controllers/paymentController';
import { RiskAssessmentService } from '../../services/riskAssessment';
import { TransactionDataService } from '../../services/transactionDataService';
import { PaymentRouterService } from '../../services/paymentRouter';
import { GeminiService } from '../../services/geminiService';
import { ChargeRequest, RiskAssessmentResult, Transaction, PaymentProvider } from '../../types';

// Mock the logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));

// Mock the helpers to avoid random generation during tests
jest.mock('../../utils/helpers', () => ({
    generateTransactionId: jest.fn(() => 'test-transaction-123')
}));

describe('PaymentController', () => {
    let paymentController: PaymentController;
    let mockRiskService: jest.Mocked<RiskAssessmentService>;
    let mockTransactionDataService: jest.Mocked<TransactionDataService>;
    let mockPaymentRouterService: jest.Mocked<PaymentRouterService>;
    let mockGeminiService: jest.Mocked<GeminiService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    const mockChargeRequest: ChargeRequest = {
        amount: 1000,
        currency: 'USD',
        source: 'card_123',
        email: 'test@example.com'
    };

    const mockRiskAssessment: RiskAssessmentResult = {
        score: 0.3,
        triggeredRules: ['high_amount', 'new_user']
    };

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock services
        mockRiskService = {
            calculateRisk: jest.fn()
        } as jest.Mocked<RiskAssessmentService>;

        mockTransactionDataService = {
            storeTransaction: jest.fn(),
            getAllTransactions: jest.fn(),
            getTransactionById: jest.fn(),
            getTransactionCount: jest.fn(),
            hasTransaction: jest.fn(),
            deleteTransaction: jest.fn(),
            clearAllTransactions: jest.fn(),
            getTransactionsByStatus: jest.fn()
        } as unknown as jest.Mocked<TransactionDataService>;

        mockPaymentRouterService = {
            routePayment: jest.fn(),
            simulatePayment: jest.fn()
        } as jest.Mocked<PaymentRouterService>;

        mockGeminiService = {
            generateDescriptionFromTags: jest.fn()
        } as unknown as jest.Mocked<GeminiService>;

        // Create mock response methods
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });

        // Create mock request and response objects
        mockRequest = {
            body: mockChargeRequest,
            ip: '192.168.1.1',
            get: jest.fn().mockReturnValue('Mozilla/5.0 Test Browser'),
            params: {}
        };

        mockResponse = {
            status: mockStatus,
            json: mockJson
        };

        // Create controller instance
        paymentController = new PaymentController(
            mockRiskService,
            mockTransactionDataService,
            mockPaymentRouterService,
            mockGeminiService
        );
    });

    describe('charge', () => {
        it('should process a valid charge request successfully', async () => {
            // Arrange
            const mockProvider: PaymentProvider = 'stripe';
            const mockExplanation = 'Payment processed successfully with low risk';

            mockRiskService.calculateRisk.mockReturnValue(mockRiskAssessment);
            mockPaymentRouterService.routePayment.mockReturnValue(mockProvider);
            mockPaymentRouterService.simulatePayment.mockReturnValue(true);
            mockGeminiService.generateDescriptionFromTags.mockResolvedValue(mockExplanation);

            // Act
            await paymentController.charge(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockRiskService.calculateRisk).toHaveBeenCalledWith(mockChargeRequest);
            expect(mockPaymentRouterService.routePayment).toHaveBeenCalledWith(mockRiskAssessment.score);
            expect(mockPaymentRouterService.simulatePayment).toHaveBeenCalledWith(mockProvider);
            expect(mockGeminiService.generateDescriptionFromTags).toHaveBeenCalledWith(
                mockChargeRequest,
                mockRiskAssessment.score,
                mockProvider,
                'success',
                mockRiskAssessment.triggeredRules
            );
            expect(mockTransactionDataService.storeTransaction).toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                transactionId: 'test-transaction-123',
                provider: mockProvider,
                status: 'success',
                riskScore: mockRiskAssessment.score,
                explanation: mockExplanation
            });
        });

        it('should block payment when risk score is too high', async () => {
            // Arrange
            const highRiskAssessment: RiskAssessmentResult = {
                score: 0.9,
                triggeredRules: ['suspicious_ip', 'high_amount']
            };

            mockRiskService.calculateRisk.mockReturnValue(highRiskAssessment);
            mockPaymentRouterService.routePayment.mockReturnValue(null);
            mockGeminiService.generateDescriptionFromTags.mockResolvedValue('Payment blocked due to high risk');

            // Act
            await paymentController.charge(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockPaymentRouterService.routePayment).toHaveBeenCalledWith(highRiskAssessment.score);
            expect(mockPaymentRouterService.simulatePayment).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                transactionId: 'test-transaction-123',
                provider: null,
                status: 'blocked',
                riskScore: highRiskAssessment.score,
                explanation: 'Payment blocked due to high risk'
            });
        });

        it('should handle payment simulation failure', async () => {
            // Arrange
            const mockProvider: PaymentProvider = 'paypal';

            mockRiskService.calculateRisk.mockReturnValue(mockRiskAssessment);
            mockPaymentRouterService.routePayment.mockReturnValue(mockProvider);
            mockPaymentRouterService.simulatePayment.mockReturnValue(false);
            mockGeminiService.generateDescriptionFromTags.mockResolvedValue('Payment processing failed');

            // Act
            await paymentController.charge(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockPaymentRouterService.simulatePayment).toHaveBeenCalledWith(mockProvider);
            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                transactionId: 'test-transaction-123',
                provider: mockProvider,
                status: 'error',
                riskScore: mockRiskAssessment.score,
                explanation: 'Payment processing failed'
            });
        });

        it('should return 400 for invalid request body', async () => {
            // Arrange
            const invalidRequest = {
                ...mockRequest,
                body: {
                    amount: -100, // Invalid amount
                    currency: 'INVALID', // Invalid currency
                    source: '', // Empty source
                    email: 'invalid-email' // Invalid email
                }
            };

            // Act
            await paymentController.charge(invalidRequest as Request, mockResponse as Response);

            // Assert
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Invalid request',
                message: expect.arrayContaining([
                    expect.stringContaining('amount'),
                    expect.stringContaining('currency'),
                    expect.stringContaining('source'),
                    expect.stringContaining('email')
                ])
            });
        });

        it('should return 400 for missing request body', async () => {
            // Arrange
            const requestWithoutBody = {
                ...mockRequest,
                body: undefined
            };

            // Act
            await paymentController.charge(requestWithoutBody as Request, mockResponse as Response);

            // Assert
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Invalid request',
                message: expect.any(Array)
            });
        });

        it('should handle service errors gracefully', async () => {
            // Arrange
            mockRiskService.calculateRisk.mockImplementation(() => {
                throw new Error('Risk service error');
            });

            // Act
            await paymentController.charge(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Internal server error',
                message: 'Unable to process payment request'
            });
        });

        it('should store transaction with correct metadata', async () => {
            // Arrange
            mockRiskService.calculateRisk.mockReturnValue(mockRiskAssessment);
            mockPaymentRouterService.routePayment.mockReturnValue('stripe');
            mockPaymentRouterService.simulatePayment.mockReturnValue(true);
            mockGeminiService.generateDescriptionFromTags.mockResolvedValue('Success');

            // Act
            await paymentController.charge(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockTransactionDataService.storeTransaction).toHaveBeenCalledWith({
                id: 'test-transaction-123',
                timestamp: expect.any(Date),
                request: mockChargeRequest,
                response: expect.objectContaining({
                    transactionId: 'test-transaction-123',
                    status: 'success'
                }),
                metadata: {
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0 Test Browser'
                }
            });
        });
    });

    describe('getTransactions', () => {
        it('should return all transactions successfully', async () => {
            // Arrange
            const mockTransactions: Transaction[] = [
                {
                    id: 'txn-1',
                    timestamp: new Date(),
                    request: mockChargeRequest,
                    response: {
                        transactionId: 'txn-1',
                        provider: 'stripe',
                        status: 'success',
                        riskScore: 0.2,
                        explanation: 'Success'
                    },
                    metadata: {}
                }
            ];

            mockTransactionDataService.getAllTransactions.mockReturnValue(mockTransactions);

            // Act
            await paymentController.getTransactions(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockTransactionDataService.getAllTransactions).toHaveBeenCalled();
            expect(mockJson).toHaveBeenCalledWith({
                count: 1,
                transactions: mockTransactions
            });
        });

        it('should handle empty transactions list', async () => {
            // Arrange
            mockTransactionDataService.getAllTransactions.mockReturnValue([]);

            // Act
            await paymentController.getTransactions(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockJson).toHaveBeenCalledWith({
                count: 0,
                transactions: []
            });
        });

        it('should handle service errors gracefully', async () => {
            // Arrange
            mockTransactionDataService.getAllTransactions.mockImplementation(() => {
                throw new Error('Database error');
            });

            // Act
            await paymentController.getTransactions(mockRequest as Request, mockResponse as Response);

            // Assert
            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Internal server error',
                message: 'Unable to retrieve transactions'
            });
        });
    });

    describe('getTransaction', () => {
        it('should return transaction by ID successfully', async () => {
            // Arrange
            const mockTransaction: Transaction = {
                id: 'txn-123',
                timestamp: new Date(),
                request: mockChargeRequest,
                response: {
                    transactionId: 'txn-123',
                    provider: 'stripe',
                    status: 'success',
                    riskScore: 0.2,
                    explanation: 'Success'
                },
                metadata: {}
            };

            const requestWithId = {
                ...mockRequest,
                params: { id: 'txn-123' }
            };

            mockTransactionDataService.getTransactionById.mockReturnValue(mockTransaction);

            // Act
            await paymentController.getTransaction(requestWithId as Request, mockResponse as Response);

            // Assert
            expect(mockTransactionDataService.getTransactionById).toHaveBeenCalledWith('txn-123');
            expect(mockJson).toHaveBeenCalledWith(mockTransaction);
        });

        it('should return 400 when transaction ID is missing', async () => {
            // Arrange
            const requestWithoutId = {
                ...mockRequest,
                params: {}
            };

            // Act
            await paymentController.getTransaction(requestWithoutId as Request, mockResponse as Response);

            // Assert
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Invalid request',
                message: 'Transaction ID is required'
            });
        });

        it('should return 404 when transaction is not found', async () => {
            // Arrange
            const requestWithId = {
                ...mockRequest,
                params: { id: 'non-existent' }
            };

            mockTransactionDataService.getTransactionById.mockReturnValue(undefined);

            // Act
            await paymentController.getTransaction(requestWithId as Request, mockResponse as Response);

            // Assert
            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Transaction not found',
                message: 'No transaction found with ID: non-existent'
            });
        });

        it('should handle service errors gracefully', async () => {
            // Arrange
            const requestWithId = {
                ...mockRequest,
                params: { id: 'txn-123' }
            };

            mockTransactionDataService.getTransactionById.mockImplementation(() => {
                throw new Error('Database error');
            });

            // Act
            await paymentController.getTransaction(requestWithId as Request, mockResponse as Response);

            // Assert
            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Internal server error',
                message: 'Unable to retrieve transaction'
            });
        });
    });
});
