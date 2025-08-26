import { PaymentRouterService } from '../../services/paymentRouter';
import { PaymentProvider } from '../../types';

// Mock the fraud rules config to avoid external dependencies
jest.mock('../../config/fraudRules', () => ({
    providerConfig: {
        stripe: {
            name: 'Stripe',
            maxRiskScore: 0.4
        },
        paypal: {
            name: 'PayPal',
            maxRiskScore: 0.5
        }
    }
}));

describe('PaymentRouterService', () => {
    let paymentRouterService: PaymentRouterService;

    beforeEach(() => {
        paymentRouterService = new PaymentRouterService();
    });

    describe('routePayment', () => {
        it('should route to Stripe for low risk scores', () => {
            // Test various low risk scores
            const lowRiskScores = [0, 0.1, 0.2, 0.3, 0.39];

            lowRiskScores.forEach(riskScore => {
                // Act
                const result = paymentRouterService.routePayment(riskScore);

                // Assert
                expect(result).toBe('stripe');
            });
        });

        it('should route to PayPal for medium risk scores', () => {
            // Test various medium risk scores
            const mediumRiskScores = [0.4, 0.41, 0.45, 0.49];

            mediumRiskScores.forEach(riskScore => {
                // Act
                const result = paymentRouterService.routePayment(riskScore);

                // Assert
                expect(result).toBe('paypal');
            });
        });

        it('should block transactions for high risk scores', () => {
            // Test various high risk scores
            const highRiskScores = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

            highRiskScores.forEach(riskScore => {
                // Act
                const result = paymentRouterService.routePayment(riskScore);

                // Assert
                expect(result).toBeNull();
            });
        });

        it('should handle edge case risk scores exactly at thresholds', () => {
            // Act & Assert
            expect(paymentRouterService.routePayment(0.4)).toBe('paypal'); // Exactly at Stripe threshold (0.4 < 0.4 is false, so routes to PayPal)
            expect(paymentRouterService.routePayment(0.5)).toBeNull(); // Exactly at PayPal threshold (0.5 < 0.5 is false, so blocked)
        });

        it('should handle negative risk scores', () => {
            // Act
            const result = paymentRouterService.routePayment(-0.1);

            // Assert
            expect(result).toBe('stripe'); // Should route to Stripe (lowest risk)
        });

        it('should handle risk scores above 1.0', () => {
            // Act
            const result = paymentRouterService.routePayment(1.5);

            // Assert
            expect(result).toBeNull(); // Should be blocked
        });

        it('should handle zero risk score', () => {
            // Act
            const result = paymentRouterService.routePayment(0);

            // Assert
            expect(result).toBe('stripe');
        });

        it('should handle very small risk scores', () => {
            // Act
            const result = paymentRouterService.routePayment(0.001);

            // Assert
            expect(result).toBe('stripe');
        });
    });

    describe('simulatePayment', () => {
        it('should simulate payment with default success rate', () => {
            // Since this is a random function, we'll test the structure
            // and run it multiple times to ensure it returns boolean values

            const results: boolean[] = [];
            for (let i = 0; i < 100; i++) {
                results.push(paymentRouterService.simulatePayment('stripe'));
            }

            // Assert
            expect(results.every(result => typeof result === 'boolean')).toBe(true);
            expect(results.some(result => result === true)).toBe(true);
            expect(results.some(result => result === false)).toBe(true);
        });

        it('should simulate payment with custom success rate', () => {
            // Test with 100% success rate
            const results = [];
            for (let i = 0; i < 10; i++) {
                results.push(paymentRouterService.simulatePayment('stripe', 1.0));
            }

            // Assert
            expect(results.every(result => result === true)).toBe(true);
        });

        it('should simulate payment with 0% success rate', () => {
            // Test with 0% success rate
            const results = [];
            for (let i = 0; i < 10; i++) {
                results.push(paymentRouterService.simulatePayment('stripe', 0.0));
            }

            // Assert
            expect(results.every(result => result === false)).toBe(true);
        });

        it('should simulate payment with 50% success rate', () => {
            // Test with 50% success rate
            const results = [];
            for (let i = 0; i < 100; i++) {
                results.push(paymentRouterService.simulatePayment('stripe', 0.5));
            }

            // Assert
            expect(results.every(result => typeof result === 'boolean')).toBe(true);
            // With 100 trials and 50% success rate, we should see both true and false
            expect(results.some(result => result === true)).toBe(true);
            expect(results.some(result => result === false)).toBe(true);
        });

        it('should handle success rate above 1.0', () => {
            // Act
            const result = paymentRouterService.simulatePayment('stripe', 1.5);

            // Assert
            expect(typeof result).toBe('boolean');
            // Should be treated as 1.0, so always true
            expect(result).toBe(true);
        });

        it('should handle negative success rate', () => {
            // Act
            const result = paymentRouterService.simulatePayment('stripe', -0.5);

            // Assert
            expect(typeof result).toBe('boolean');
            // Should be treated as 0.0, so always false
            expect(result).toBe(false);
        });

        it('should work with different payment providers', () => {
            const providers: PaymentProvider[] = ['stripe', 'paypal'];

            providers.forEach(provider => {
                // Act
                const result = paymentRouterService.simulatePayment(provider, 0.8);

                // Assert
                expect(typeof result).toBe('boolean');
            });
        });

        it('should handle edge case success rates', () => {
            // Test edge cases
            const edgeCases = [0.0001, 0.9999, 0.5, 0.0, 1.0];

            edgeCases.forEach(successRate => {
                // Act
                const result = paymentRouterService.simulatePayment('stripe', successRate);

                // Assert
                expect(typeof result).toBe('boolean');
            });
        });

        it('should maintain consistent behavior for same provider and success rate', () => {
            // This test verifies that the same inputs produce consistent output types
            const provider: PaymentProvider = 'stripe';
            const successRate = 0.7;

            // Act
            const result1 = paymentRouterService.simulatePayment(provider, successRate);
            const result2 = paymentRouterService.simulatePayment(provider, successRate);

            // Assert
            expect(typeof result1).toBe('boolean');
            expect(typeof result2).toBe('boolean');
            // Note: We can't guarantee they're the same due to randomness,
            // but we can verify they're both booleans
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete payment flow from routing to simulation', () => {
            // Test low risk -> Stripe -> simulate
            const lowRiskResult = paymentRouterService.routePayment(0.2);
            expect(lowRiskResult).toBe('stripe');

            if (lowRiskResult) {
                const simulationResult = paymentRouterService.simulatePayment(lowRiskResult);
                expect(typeof simulationResult).toBe('boolean');
            }
        });

        it('should handle medium risk -> PayPal -> simulate', () => {
            // Test medium risk -> PayPal -> simulate
            const mediumRiskResult = paymentRouterService.routePayment(0.45);
            expect(mediumRiskResult).toBe('paypal');

            if (mediumRiskResult) {
                const simulationResult = paymentRouterService.simulatePayment(mediumRiskResult);
                expect(typeof simulationResult).toBe('boolean');
            }
        });

        it('should handle high risk -> blocked (no simulation)', () => {
            // Test high risk -> blocked
            const highRiskResult = paymentRouterService.routePayment(0.8);
            expect(highRiskResult).toBeNull();
            // No simulation should occur for blocked transactions
        });

        it('should demonstrate risk-based routing strategy', () => {
            // This test demonstrates the complete risk-based routing strategy

            // Low risk: 0.0 - 0.39 -> Stripe
            expect(paymentRouterService.routePayment(0.0)).toBe('stripe');
            expect(paymentRouterService.routePayment(0.39)).toBe('stripe');

            // Medium risk: 0.4 - 0.49 -> PayPal
            expect(paymentRouterService.routePayment(0.4)).toBe('paypal');
            expect(paymentRouterService.routePayment(0.49)).toBe('paypal');

            // High risk: 0.5+ -> Blocked
            expect(paymentRouterService.routePayment(0.5)).toBeNull();
            expect(paymentRouterService.routePayment(1.0)).toBeNull();
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle NaN risk scores', () => {
            // Act
            const result = paymentRouterService.routePayment(NaN);

            // Assert
            // NaN < 0.4 is false, and NaN < 0.5 is also false, so it should be blocked
            expect(result).toBeNull();
        });

        it('should handle Infinity risk scores', () => {
            // Act
            const result = paymentRouterService.routePayment(Infinity);

            // Assert
            // Infinity is not < 0.4 or < 0.5, so it should be blocked
            expect(result).toBeNull();
        });

        it('should handle very large numbers', () => {
            // Act
            const result = paymentRouterService.routePayment(Number.MAX_SAFE_INTEGER);

            // Assert
            expect(result).toBeNull();
        });

        it('should handle very small decimal numbers', () => {
            // Act
            const result = paymentRouterService.routePayment(0.0000001);

            // Assert
            expect(result).toBe('stripe');
        });
    });
});
