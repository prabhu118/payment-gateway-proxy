import { fraudRules, providerConfig } from '../../config/fraudRules';
import { ChargeRequest } from '../../types';

describe('Fraud Rules Configuration', () => {
    describe('fraudRules array', () => {
        it('should contain the expected number of rules', () => {
            // Assert
            expect(fraudRules).toHaveLength(5);
        });

        it('should have all required properties for each rule', () => {
            fraudRules.forEach(rule => {
                // Assert
                expect(rule).toHaveProperty('ruleName');
                expect(rule).toHaveProperty('weight');
                expect(rule).toHaveProperty('condition');
                expect(typeof rule.ruleName).toBe('string');
                expect(typeof rule.weight).toBe('number');
                expect(typeof rule.condition).toBe('function');
            });
        });

        it('should have rule names that match expected values', () => {
            const expectedRuleNames = [
                'Large Amount',
                'Very Large Amount',
                'Suspicious Domain',
                'Invalid Email Format',
                'Test Token'
            ];

            // Assert
            expect(fraudRules.map(rule => rule.ruleName)).toEqual(expectedRuleNames);
        });

        it('should have weights that sum to expected total', () => {
            const totalWeight = fraudRules.reduce((sum, rule) => sum + rule.weight, 0);

            // Assert
            expect(totalWeight).toBeCloseTo(1.4, 10); // 0.3 + 0.4 + 0.4 + 0.2 + 0.1
        });
    });

    describe('Large Amount Rule', () => {
        const largeAmountRule = fraudRules.find(rule => rule.ruleName === 'Large Amount')!;

        it('should trigger for amounts between 50000 and 100000', () => {
            // Test amounts that should trigger the rule
            const triggeringAmounts = [50001, 75000, 99999];

            triggeringAmounts.forEach(amount => {
                const request: ChargeRequest = {
                    amount,
                    currency: 'USD',
                    source: 'card_123',
                    email: 'user@example.com'
                };

                // Act
                const result = largeAmountRule.condition(request);

                // Assert
                expect(result).toBe(true);
            });
        });

        it('should not trigger for amounts at or below 50000', () => {
            // Test amounts that should not trigger the rule
            const nonTriggeringAmounts = [0, 1000, 50000];

            nonTriggeringAmounts.forEach(amount => {
                const request: ChargeRequest = {
                    amount,
                    currency: 'USD',
                    source: 'card_123',
                    email: 'user@example.com'
                };

                // Act
                const result = largeAmountRule.condition(request);

                // Assert
                expect(result).toBe(false);
            });
        });

        it('should not trigger for amounts at or above 100000', () => {
            // Test amounts that should not trigger the rule
            const nonTriggeringAmounts = [100000, 150000, 1000000];

            nonTriggeringAmounts.forEach(amount => {
                const request: ChargeRequest = {
                    amount,
                    currency: 'USD',
                    source: 'card_123',
                    email: 'user@example.com'
                };

                // Act
                const result = largeAmountRule.condition(request);

                // Assert
                expect(result).toBe(false);
            });
        });

        it('should have correct weight', () => {
            // Assert
            expect(largeAmountRule.weight).toBe(0.3);
        });
    });

    describe('Very Large Amount Rule', () => {
        const veryLargeAmountRule = fraudRules.find(rule => rule.ruleName === 'Very Large Amount')!;

        it('should trigger for amounts above 100000', () => {
            // Test amounts that should trigger the rule
            const triggeringAmounts = [100001, 150000, 1000000, 9999999];

            triggeringAmounts.forEach(amount => {
                const request: ChargeRequest = {
                    amount,
                    currency: 'USD',
                    source: 'card_123',
                    email: 'user@example.com'
                };

                // Act
                const result = veryLargeAmountRule.condition(request);

                // Assert
                expect(result).toBe(true);
            });
        });

        it('should not trigger for amounts at or below 100000', () => {
            // Test amounts that should not trigger the rule
            const nonTriggeringAmounts = [0, 1000, 50000, 100000];

            nonTriggeringAmounts.forEach(amount => {
                const request: ChargeRequest = {
                    amount,
                    currency: 'USD',
                    source: 'card_123',
                    email: 'user@example.com'
                };

                // Act
                const result = veryLargeAmountRule.condition(request);

                // Assert
                expect(result).toBe(false);
            });
        });

        it('should have correct weight', () => {
            // Assert
            expect(veryLargeAmountRule.weight).toBe(0.4);
        });
    });

    describe('Suspicious Domain Rule', () => {
        const suspiciousDomainRule = fraudRules.find(rule => rule.ruleName === 'Suspicious Domain')!;

        it('should trigger for emails with suspicious domains', () => {
            const suspiciousDomains = ['.ru', '.tk', '.ml', 'test.com', '10minutemail', 'mailinator'];

            suspiciousDomains.forEach(domain => {
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source: 'card_123',
                    email: `user${domain}`
                };

                // Act
                const result = suspiciousDomainRule.condition(request);

                // Assert
                expect(result).toBe(true);
            });
        });

        it('should trigger for emails with suspicious domains in different positions', () => {
            const testCases = [
                'user@test.com',
                'admin@10minutemail.org',
                'customer@mailinator.net',
                'test@domain.ru',
                'user@subdomain.tk'
            ];

            testCases.forEach(email => {
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source: 'card_123',
                    email
                };

                // Act
                const result = suspiciousDomainRule.condition(request);

                // Assert
                expect(result).toBe(true);
            });
        });

        it('should not trigger for legitimate email domains', () => {
            const legitimateEmails = [
                'user@example.com',
                'admin@company.org',
                'customer@business.net',
                'test@domain.co.uk',
                'user@subdomain.com'
            ];

            legitimateEmails.forEach(email => {
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source: 'card_123',
                    email
                };

                // Act
                const result = suspiciousDomainRule.condition(request);

                // Assert
                expect(result).toBe(false);
            });
        });

        it('should be case insensitive', () => {
            const testCases = [
                'user@TEST.COM',
                'admin@Test.Com',
                'customer@TEST.com'
            ];

            testCases.forEach(email => {
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source: 'card_123',
                    email
                };

                // Act
                const result = suspiciousDomainRule.condition(request);

                // Assert
                expect(result).toBe(true);
            });
        });

        it('should have correct weight', () => {
            // Assert
            expect(suspiciousDomainRule.weight).toBe(0.4);
        });
    });

    describe('Invalid Email Format Rule', () => {
        const invalidEmailFormatRule = fraudRules.find(rule => rule.ruleName === 'Invalid Email Format')!;

        it('should trigger for invalid email formats', () => {
            const invalidEmails = [
                'user@',
                '@example.com',
                '',
                'justtext'
            ];

            invalidEmails.forEach(email => {
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source: 'card_123',
                    email
                };

                // Act
                const result = invalidEmailFormatRule.condition(request);

                // Assert
                expect(result).toBe(true);
            });
        });

        it('should not trigger for valid email formats', () => {
            const validEmails = [
                'user@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org',
                '123@456.789',
                'user-name@domain.com',
                'user_name@domain.net'
            ];

            validEmails.forEach(email => {
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source: 'card_123',
                    email
                };

                // Act
                const result = invalidEmailFormatRule.condition(request);

                // Assert
                expect(result).toBe(false);
            });
        });

        it('should have correct weight', () => {
            // Assert
            expect(invalidEmailFormatRule.weight).toBe(0.2);
        });
    });

    describe('Test Token Rule', () => {
        const testTokenRule = fraudRules.find(rule => rule.ruleName === 'Test Token')!;

        it('should trigger for sources containing "test"', () => {
            const testSources = [
                'test_token_123',
                'card_test_456',
                'source_test',
                'test123',
                '123test456'
            ];

            testSources.forEach(source => {
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source,
                    email: 'user@example.com'
                };

                // Act
                const result = testTokenRule.condition(request);

                // Assert
                expect(result).toBe(true);
            });
        });

        it('should not trigger for sources without "test"', () => {
            const validSources = [
                'card_123',
                'token_456',
                'source_789',
                'payment_method',
                'credit_card'
            ];

            validSources.forEach(source => {
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source,
                    email: 'user@example.com'
                };

                // Act
                const result = testTokenRule.condition(request);

                // Assert
                expect(result).toBe(false);
            });
        });

        it('should be case sensitive', () => {
            const testCases = [
                'test_TOKEN', // Should trigger (contains 'test')
                'Test_Token', // Should NOT trigger (contains 'Test', not 'test')
                'TEST_token', // Should NOT trigger (contains 'TEST', not 'test')
                'TOKEN_test'  // Should trigger (contains 'test')
            ];

            testCases.forEach(source => {
                const request: ChargeRequest = {
                    amount: 1000,
                    currency: 'USD',
                    source,
                    email: 'user@example.com'
                };

                // Act
                const result = testTokenRule.condition(request);

                // Assert
                if (source.includes('test')) {
                    expect(result).toBe(true);
                } else {
                    expect(result).toBe(false);
                }
            });
        });

        it('should have correct weight', () => {
            // Assert
            expect(testTokenRule.weight).toBe(0.1);
        });
    });

    describe('providerConfig', () => {
        it('should contain stripe configuration', () => {
            // Assert
            expect(providerConfig.stripe).toBeDefined();
            expect(providerConfig.stripe.name).toBe('Stripe');
            expect(providerConfig.stripe.maxRiskScore).toBe(0.4);
        });

        it('should contain paypal configuration', () => {
            // Assert
            expect(providerConfig.paypal).toBeDefined();
            expect(providerConfig.paypal.name).toBe('PayPal');
            expect(providerConfig.paypal.maxRiskScore).toBe(0.5);
        });

        it('should have correct risk score thresholds', () => {
            // Assert
            expect(providerConfig.stripe.maxRiskScore).toBeLessThan(providerConfig.paypal.maxRiskScore);
            expect(providerConfig.stripe.maxRiskScore).toBe(0.4);
            expect(providerConfig.paypal.maxRiskScore).toBe(0.5);
        });
    });

    describe('integration scenarios', () => {
        it('should handle multiple rule triggers correctly', () => {
            // Create a request that should trigger multiple rules
            const highRiskRequest: ChargeRequest = {
                amount: 150000, // Triggers Very Large Amount (0.4)
                currency: 'USD',
                source: 'test_token_123', // Triggers Test Token (0.1)
                email: 'user@test.com' // Triggers Suspicious Domain (0.4)
            };

            // Check which rules are triggered
            const triggeredRules = fraudRules.filter(rule => rule.condition(highRiskRequest));
            const totalRiskScore = triggeredRules.reduce((sum, rule) => sum + rule.weight, 0);

            // Assert
            expect(triggeredRules).toHaveLength(3);
            expect(triggeredRules.map(rule => rule.ruleName)).toContain('Very Large Amount');
            expect(triggeredRules.map(rule => rule.ruleName)).toContain('Test Token');
            expect(triggeredRules.map(rule => rule.ruleName)).toContain('Suspicious Domain');
            expect(totalRiskScore).toBe(0.9); // 0.4 + 0.1 + 0.4
        });

        it('should handle edge case amounts correctly', () => {
            // Test exactly at threshold amounts
            const edgeCaseRequests = [
                {
                    amount: 50000, // Exactly at Large Amount threshold (should not trigger)
                    expectedRules: []
                },
                {
                    amount: 50001, // Just above Large Amount threshold (should trigger)
                    expectedRules: ['Large Amount']
                },
                {
                    amount: 100000, // Exactly at Very Large Amount threshold (should not trigger)
                    expectedRules: []
                },
                {
                    amount: 100001, // Just above Very Large Amount threshold (should trigger)
                    expectedRules: ['Very Large Amount']
                }
            ];

            edgeCaseRequests.forEach(({ amount, expectedRules }) => {
                const request: ChargeRequest = {
                    amount,
                    currency: 'USD',
                    source: 'card_123',
                    email: 'user@example.com'
                };

                // Act
                const triggeredRules = fraudRules.filter(rule => rule.condition(request));

                // Assert
                expect(triggeredRules.map(rule => rule.ruleName)).toEqual(expectedRules);
            });
        });

        it('should work with different currencies', () => {
            // Test that rules work regardless of currency
            const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
            const testAmount = 60000; // Should trigger Large Amount rule

            currencies.forEach(currency => {
                const request: ChargeRequest = {
                    amount: testAmount,
                    currency,
                    source: 'card_123',
                    email: 'user@example.com'
                };

                // Act
                const triggeredRules = fraudRules.filter(rule => rule.condition(request));

                // Assert
                expect(triggeredRules.map(rule => rule.ruleName)).toContain('Large Amount');
            });
        });
    });

    describe('rule validation', () => {
        it('should have all rules with positive weights', () => {
            fraudRules.forEach(rule => {
                // Assert
                expect(rule.weight).toBeGreaterThan(0);
                expect(rule.weight).toBeLessThanOrEqual(1);
            });
        });

        it('should have unique rule names', () => {
            const ruleNames = fraudRules.map(rule => rule.ruleName);
            const uniqueRuleNames = new Set(ruleNames);

            // Assert
            expect(uniqueRuleNames.size).toBe(ruleNames.length);
        });

        it('should have rules that can be executed without errors', () => {
            const testRequest: ChargeRequest = {
                amount: 1000,
                currency: 'USD',
                source: 'card_123',
                email: 'user@example.com'
            };

            // Act & Assert - All rules should execute without throwing errors
            fraudRules.forEach(rule => {
                expect(() => rule.condition(testRequest)).not.toThrow();
            });
        });
    });
});
