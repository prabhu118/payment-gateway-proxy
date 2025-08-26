import { GeminiService } from '../../services/geminiService';
import { ChargeRequest } from '../../types';

// Mock external dependencies
jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

jest.mock('../../utils/helpers', () => ({
    formatAmount: jest.fn((amount: number, currency: string) => `${currency}${amount}`)
}));

// Mock NodeCache at module level
const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    flushAll: jest.fn()
};

jest.mock('node-cache', () => {
    return jest.fn().mockImplementation(() => mockCache);
});

describe('GeminiService', () => {
    let geminiService: GeminiService;
    let mockGenAI: any;
    let mockChargeRequest: ChargeRequest;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock environment variables
        process.env.GEMINI_API_KEY = 'test-api-key';

        // Create mock GenAI instance
        mockGenAI = {
            models: {
                generateContent: jest.fn()
            }
        };

        // Mock the GoogleGenAI constructor
        const { GoogleGenAI } = require('@google/genai');
        GoogleGenAI.mockImplementation(() => mockGenAI);

        mockChargeRequest = {
            amount: 1000,
            currency: 'USD',
            source: 'card_123',
            email: 'user@example.com'
        };
    });

    afterEach(() => {
        delete process.env.GEMINI_API_KEY;
    });

    describe('constructor', () => {
        it('should initialize with default configuration', () => {
            // Act
            geminiService = new GeminiService();

            // Assert
            expect(geminiService).toBeInstanceOf(GeminiService);
        });

        it('should initialize with custom configuration', () => {
            // Act
            geminiService = new GeminiService({
                model: 'gemini-1.5-pro',
                fallbackToSimulated: false
            });

            // Assert
            expect(geminiService).toBeInstanceOf(GeminiService);
        });

        it('should handle missing API key gracefully', () => {
            // Arrange
            delete process.env.GEMINI_API_KEY;

            // Act
            geminiService = new GeminiService();

            // Assert
            expect(geminiService).toBeInstanceOf(GeminiService);
        });

        it('should handle GenAI initialization failure gracefully', () => {
            // Arrange
            const { GoogleGenAI } = require('@google/genai');
            GoogleGenAI.mockImplementation(() => {
                throw new Error('Initialization failed');
            });

            // Act
            geminiService = new GeminiService();

            // Assert
            expect(geminiService).toBeInstanceOf(GeminiService);
        });
    });

    describe('generateDescriptionFromTags', () => {
        beforeEach(() => {
            geminiService = new GeminiService();
        });

        it('should return cached response when available', async () => {
            // Arrange
            const cachedResponse = 'Cached explanation';
            mockCache.get.mockReturnValue(cachedResponse);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(result).toBe(cachedResponse);
            expect(mockCache.get).toHaveBeenCalled();
        });

        it('should generate explanation using Gemini when available', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined); // No cache hit
            mockGenAI.models.generateContent.mockResolvedValue({
                text: 'Generated explanation from Gemini'
            });

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(result).toBe('Generated explanation from Gemini');
            expect(mockGenAI.models.generateContent).toHaveBeenCalled();
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should fallback to simulated explanation when Gemini fails', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);
            mockGenAI.models.generateContent.mockRejectedValue(new Error('API Error'));

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(result).toContain('USD1000');
            expect(result).toContain('stripe');
            expect(result).toContain('success');
            expect(result).toContain('large_amount');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should fallback to simulated explanation when Gemini returns empty response', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);
            mockGenAI.models.generateContent.mockResolvedValue({
                text: ''
            });

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(result).toContain('USD1000');
            expect(result).toContain('stripe');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should use simulated explanation when GenAI is not available', async () => {
            // Arrange
            delete process.env.GEMINI_API_KEY;
            geminiService = new GeminiService();

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(result).toContain('USD1000');
            expect(result).toContain('stripe');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should throw error when fallback is disabled and Gemini fails', async () => {
            // Arrange
            geminiService = new GeminiService({ fallbackToSimulated: false });
            mockCache.get.mockReturnValue(undefined);
            mockGenAI.models.generateContent.mockRejectedValue(new Error('API Error'));

            // Act & Assert
            await expect(
                geminiService.generateDescriptionFromTags(
                    mockChargeRequest,
                    0.3,
                    'stripe',
                    'success',
                    ['large_amount']
                )
            ).rejects.toThrow('LLM service unavailable and fallback disabled');
        });

        it('should handle blocked transaction status', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.8,
                null,
                'blocked',
                ['suspicious_ip', 'high_amount']
            );

            // Assert
            expect(result).toContain('blocked');
            expect(result).toContain('0.8');
            expect(result).toContain('suspicious_ip');
            expect(result).toContain('high_amount');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should handle error transaction status', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.5,
                'paypal',
                'error',
                ['test_token']
            );

            // Assert
            expect(result).toContain('encountered an issue');
            expect(result).toContain('USD1000');
            expect(result).toContain('0.5');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should handle success transaction status with different risk levels', async () => {
            // Test low risk
            mockCache.get.mockReturnValue(undefined);
            const lowRiskResult = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.1,
                'stripe',
                'success',
                []
            );
            expect(lowRiskResult).toContain('low risk assessment');

            // Test moderate risk
            const moderateRiskResult = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.6,
                'paypal',
                'success',
                ['large_amount']
            );
            expect(moderateRiskResult).toContain('moderate risk assessment');
        });

        it('should handle null provider gracefully', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                null,
                'success',
                []
            );

            // Assert
            expect(result).toContain('USD1000');
            expect(result).toContain('success');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should handle empty triggered rules array', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.2,
                'stripe',
                'success',
                []
            );

            // Assert
            expect(result).toContain('USD1000');
            expect(result).toContain('Transaction routed to stripe');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should handle multiple triggered rules', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.7,
                'paypal',
                'success',
                ['large_amount', 'suspicious_domain', 'test_token']
            );

            // Assert
            expect(result).toContain('large_amount');
            expect(result).toContain('suspicious_domain');
            expect(result).toContain('test_token');
            expect(mockCache.set).toHaveBeenCalled();
        });
    });

    describe('cache functionality', () => {
        beforeEach(() => {
            geminiService = new GeminiService();
        });

        it('should generate cache key correctly', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);
            mockGenAI.models.generateContent.mockResolvedValue({
                text: 'Test explanation'
            });

            // Act
            await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(mockCache.get).toHaveBeenCalled();
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should handle different cache keys for different parameters', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);
            mockGenAI.models.generateContent.mockResolvedValue({
                text: 'Test explanation'
            });

            // Act - First call
            await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Act - Second call with different parameters
            await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.8,
                'paypal',
                'blocked',
                ['suspicious_ip']
            );

            // Assert
            expect(mockCache.get).toHaveBeenCalledTimes(2);
            expect(mockCache.set).toHaveBeenCalledTimes(2);
        });

        it('should cache successful Gemini responses', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);
            const geminiResponse = 'Generated explanation from Gemini';
            mockGenAI.models.generateContent.mockResolvedValue({
                text: geminiResponse
            });

            // Act
            await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(mockCache.set).toHaveBeenCalledWith(
                expect.any(String), // cache key
                geminiResponse
            );
        });

        it('should cache simulated fallback responses', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);
            mockGenAI.models.generateContent.mockRejectedValue(new Error('API Error'));

            // Act
            await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(mockCache.set).toHaveBeenCalledWith(
                expect.any(String), // cache key
                expect.any(String) // simulated response
            );
        });
    });

    describe('error handling', () => {
        beforeEach(() => {
            geminiService = new GeminiService();
        });

        it('should handle GenAI model generation failure', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);
            mockGenAI.models.generateContent.mockRejectedValue(new Error('Model generation failed'));

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(result).toContain('USD1000');
            expect(result).toContain('stripe');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should handle GenAI client not initialized error', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);
            mockGenAI.models.generateContent.mockRejectedValue(new Error('Client not initialized'));

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(result).toContain('USD1000');
            expect(result).toContain('stripe');
            expect(mockCache.set).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        beforeEach(() => {
            geminiService = new GeminiService();
        });

        it('should handle very high risk scores', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0.99,
                'stripe',
                'success',
                ['very_high_risk']
            );

            // Assert
            expect(result).toContain('0.99');
            expect(result).toContain('very_high_risk');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should handle zero risk score', async () => {
            // Arrange
            mockCache.get.mockReturnValue(undefined);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                mockChargeRequest,
                0,
                'stripe',
                'success',
                []
            );

            // Assert
            expect(result).toContain('0');
            expect(result).toContain('low risk assessment');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should handle very large amounts', async () => {
            // Arrange
            const largeAmountRequest = {
                ...mockChargeRequest,
                amount: 999999
            };
            mockCache.get.mockReturnValue(undefined);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                largeAmountRequest,
                0.3,
                'stripe',
                'success',
                ['large_amount']
            );

            // Assert
            expect(result).toContain('USD999999');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should handle special characters in email', async () => {
            // Arrange
            const specialEmailRequest = {
                ...mockChargeRequest,
                email: 'user+tag@example-domain.co.uk'
            };
            mockCache.get.mockReturnValue(undefined);

            // Act
            const result = await geminiService.generateDescriptionFromTags(
                specialEmailRequest,
                0.3,
                'stripe',
                'success',
                []
            );

            // Assert
            expect(result).toContain('USD1000');
            expect(result).toContain('stripe');
            expect(mockCache.set).toHaveBeenCalled();
        });
    });
});
