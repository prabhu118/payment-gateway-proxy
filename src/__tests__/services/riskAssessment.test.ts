import { RiskAssessmentService } from '../../services/riskAssessment';
import { ChargeRequest } from '../../types';

// Mock the fraud rules to avoid external dependencies
jest.mock('../../config/fraudRules', () => ({
    fraudRules: [
        {
            ruleName: 'Large Amount',
            weight: 0.3,
            condition: (request: ChargeRequest) => request.amount > 50000 && request.amount < 100000
        },
        {
            ruleName: 'Very Large Amount',
            weight: 0.4,
            condition: (request: ChargeRequest) => request.amount > 100000
        },
        {
            ruleName: 'Suspicious Domain',
            weight: 0.4,
            condition: (request: ChargeRequest) => {
                const suspiciousDomains = ['.ru', '.tk', '.ml', 'test.com', '10minutemail', 'mailinator'];
                return suspiciousDomains.some(domain => request.email.toLowerCase().includes(domain));
            }
        },
        {
            ruleName: 'Invalid Email Format',
            weight: 0.2,
            condition: (request: ChargeRequest) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !emailRegex.test(request.email);
            }
        },
        {
            ruleName: 'Test Token',
            weight: 0.1,
            condition: (request: ChargeRequest) => request.source.includes('test')
        },
        {
            ruleName: 'Blacklisted Source',
            weight: 0.4,
            condition: (request: ChargeRequest) => request.source.includes('dream11')
        }
    ]
}));

describe('RiskAssessmentService', () => {
    let riskAssessmentService: RiskAssessmentService;

    beforeEach(() => {
        riskAssessmentService = new RiskAssessmentService();
    });

    describe('calculateRisk', () => {
        it('should return zero risk score for low-risk request', () => {
            // Arrange
            const lowRiskRequest: ChargeRequest = {
                amount: 1000,
                currency: 'USD',
                source: 'card_123',
                email: 'user@example.com'
            };

            // Act
            const result = riskAssessmentService.calculateRisk(lowRiskRequest);

            // Assert
            expect(result.score).toBe(0);
            expect(result.triggeredRules).toEqual([]);
        });

        it('should detect large amount rule', () => {
            // Arrange
            const largeAmountRequest: ChargeRequest = {
                amount: 60000, // > 50000
                currency: 'USD',
                source: 'card_123',
                email: 'user@example.com'
            };

            // Act
            const result = riskAssessmentService.calculateRisk(largeAmountRequest);

            // Assert
            expect(result.score).toBe(0.3);
            expect(result.triggeredRules).toEqual(['Large Amount']);
        });

        it('should detect very large amount rule', () => {
            // Arrange
            const veryLargeAmountRequest: ChargeRequest = {
                amount: 150000, // > 100000
                currency: 'USD',
                source: 'card_123',
                email: 'user@example.com'
            };

            // Act
            const result = riskAssessmentService.calculateRisk(veryLargeAmountRequest);

            // Assert
            expect(result.score).toBe(0.4);
            expect(result.triggeredRules).toEqual(['Very Large Amount']);
        });

        it('should detect suspicious domain rule', () => {
            // Arrange
            const suspiciousDomainRequest: ChargeRequest = {
                amount: 1000,
                currency: 'USD',
                source: 'card_123',
                email: 'user@test.com' // Contains suspicious domain
            };

            // Act
            const result = riskAssessmentService.calculateRisk(suspiciousDomainRequest);

            // Assert
            expect(result.score).toBe(0.4);
            expect(result.triggeredRules).toEqual(['Suspicious Domain']);
        });

        it('should detect invalid email format rule', () => {
            // Arrange
            const invalidEmailRequest: ChargeRequest = {
                amount: 1000,
                currency: 'USD',
                source: 'card_123',
                email: 'invalid-email' // Invalid email format
            };

            // Act
            const result = riskAssessmentService.calculateRisk(invalidEmailRequest);

            // Assert
            expect(result.score).toBe(0.2);
            expect(result.triggeredRules).toEqual(['Invalid Email Format']);
        });

        it('should detect test token rule', () => {
            // Arrange
            const testTokenRequest: ChargeRequest = {
                amount: 1000,
                currency: 'USD',
                source: 'test_token_123', // Contains 'test'
                email: 'user@example.com'
            };

            // Act
            const result = riskAssessmentService.calculateRisk(testTokenRequest);

            // Assert
            expect(result.score).toBe(0.1);
            expect(result.triggeredRules).toEqual(['Test Token']);
        });

        it('should combine multiple rule scores', () => {
            // Arrange
            const multiRuleRequest: ChargeRequest = {
                amount: 60000, // Triggers Large Amount (0.3)
                currency: 'USD',
                source: 'test_token_123', // Triggers Test Token (0.1)
                email: 'user@example.com'
            };

            // Act
            const result = riskAssessmentService.calculateRisk(multiRuleRequest);

            // Assert
            expect(result.score).toBe(0.4); // 0.3 + 0.1
            expect(result.triggeredRules).toContain('Large Amount');
            expect(result.triggeredRules).toContain('Test Token');
            expect(result.triggeredRules).toHaveLength(2);
        });

        it('should cap risk score at 1.0', () => {
            // Arrange
            const highRiskRequest: ChargeRequest = {
                amount: 150000,
                currency: 'USD',
                source: 'tk_dream11',
                email: 'user@mailinator.com'
            };

            // Act
            const result = riskAssessmentService.calculateRisk(highRiskRequest);

            // Assert
            expect(result.score).toBe(1.0);
            expect(result.triggeredRules).toContain('Very Large Amount');
            expect(result.triggeredRules).toContain('Suspicious Domain');
            expect(result.triggeredRules).toHaveLength(3);
        });

        it('should handle edge case amounts', () => {
            // Arrange
            const edgeCaseRequest: ChargeRequest = {
                amount: 50000, // Exactly at threshold (should not trigger)
                currency: 'USD',
                source: 'card_123',
                email: 'user@example.com'
            };

            // Act
            const result = riskAssessmentService.calculateRisk(edgeCaseRequest);

            // Assert
            expect(result.score).toBe(0);
            expect(result.triggeredRules).toEqual([]);
        });

        it('should handle edge case amounts that trigger rules', () => {
            // Arrange
            const edgeCaseRequest: ChargeRequest = {
                amount: 50001, // Just above threshold (should trigger)
                currency: 'USD',
                source: 'card_123',
                email: 'user@example.com'
            };

            // Act
            const result = riskAssessmentService.calculateRisk(edgeCaseRequest);

            // Assert
            expect(result.score).toBe(0.3);
            expect(result.triggeredRules).toEqual(['Large Amount']);
        });

        it('should handle various suspicious domains', () => {
            const suspiciousDomains = ['.ru', '.tk', '.ml', 'test.com', '10minutemail'];

            suspiciousDomains.forEach(domain => {
                // Arrange
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source: 'card_123',
                    email: `user${domain}`
                };

                // Act
                const result = riskAssessmentService.calculateRisk(request);

                // Assert
                expect(result.score).toBe(0.6);
                expect(result.triggeredRules).toContain('Suspicious Domain');
                expect(result.triggeredRules).toContain('Invalid Email Format');
            });
        });

        it('should handle valid email formats', () => {
            const validEmails = [
                'user@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org',
                '123@456.789'
            ];

            validEmails.forEach(email => {
                // Arrange
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source: 'card_123',
                    email
                };

                // Act
                const result = riskAssessmentService.calculateRisk(request);

                // Assert
                expect(result.triggeredRules).not.toContain('Invalid Email Format');
            });
        });

        it('should handle invalid email formats', () => {
            const invalidEmails = [
                'invalid-email',
                'user@',
                '@example.com',
                'user@.com',
                'user.example.com',
                ''
            ];

            invalidEmails.forEach(email => {
                // Arrange
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source: 'card_123',
                    email
                };

                // Act
                const result = riskAssessmentService.calculateRisk(request);

                // Assert
                expect(result.triggeredRules).toContain('Invalid Email Format');
            });
        });
    });
});
