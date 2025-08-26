import { generateTransactionId, formatAmount } from '../../utils/helpers';

describe('Helpers Utility Functions', () => {
    describe('generateTransactionId', () => {
        it('should generate transaction ID with correct format', () => {
            // Act
            const transactionId = generateTransactionId();

            // Assert
            expect(transactionId).toMatch(/^txn_[a-z0-9]{9}$/);
            expect(transactionId).toHaveLength(13); // "txn_" + 9 characters
        });

        it('should generate unique transaction IDs', () => {
            // Act
            const id1 = generateTransactionId();
            const id2 = generateTransactionId();
            const id3 = generateTransactionId();

            // Assert
            expect(id1).not.toBe(id2);
            expect(id1).not.toBe(id3);
            expect(id2).not.toBe(id3);
        });

        it('should generate multiple transaction IDs successfully', () => {
            // Act
            const ids = Array.from({ length: 100 }, () => generateTransactionId());

            // Assert
            expect(ids).toHaveLength(100);
            ids.forEach(id => {
                expect(id).toMatch(/^txn_[a-z0-9]{9}$/);
            });
        });

        it('should start with "txn_" prefix', () => {
            // Act
            const transactionId = generateTransactionId();

            // Assert
            expect(transactionId.startsWith('txn_')).toBe(true);
        });

        it('should contain only alphanumeric characters after prefix', () => {
            // Act
            const transactionId = generateTransactionId();
            const suffix = transactionId.substring(4); // Remove "txn_" prefix

            // Assert
            expect(suffix).toMatch(/^[a-z0-9]{9}$/);
            expect(suffix).not.toMatch(/[^a-z0-9]/);
        });

        it('should generate different IDs on each call', () => {
            // Act
            const ids = new Set();
            for (let i = 0; i < 50; i++) {
                ids.add(generateTransactionId());
            }

            // Assert
            expect(ids.size).toBe(50); // All IDs should be unique
        });
    });

    describe('formatAmount', () => {
        it('should format USD amounts correctly', () => {
            // Act & Assert
            expect(formatAmount(1000, 'USD')).toBe('$1,000.00');
            expect(formatAmount(1234.56, 'USD')).toBe('$1,234.56');
            expect(formatAmount(0, 'USD')).toBe('$0.00');
            expect(formatAmount(0.99, 'USD')).toBe('$0.99');
        });

        it('should format EUR amounts correctly', () => {
            // Act & Assert
            expect(formatAmount(1000, 'EUR')).toBe('€1,000.00');
            expect(formatAmount(1234.56, 'EUR')).toBe('€1,234.56');
            expect(formatAmount(0, 'EUR')).toBe('€0.00');
        });

        it('should format GBP amounts correctly', () => {
            // Act & Assert
            expect(formatAmount(1000, 'GBP')).toBe('£1,000.00');
            expect(formatAmount(1234.56, 'GBP')).toBe('£1,234.56');
            expect(formatAmount(0, 'GBP')).toBe('£0.00');
        });

        it('should handle decimal precision correctly', () => {
            // Act & Assert
            expect(formatAmount(100.1, 'USD')).toBe('$100.10');
            expect(formatAmount(100.123, 'USD')).toBe('$100.12'); // Rounded to 2 decimal places
            expect(formatAmount(100.999, 'USD')).toBe('$101.00'); // Rounded to 2 decimal places
        });

        it('should handle large amounts correctly', () => {
            // Act & Assert
            expect(formatAmount(1000000, 'USD')).toBe('$1,000,000.00');
            expect(formatAmount(999999.99, 'USD')).toBe('$999,999.99');
            expect(formatAmount(1234567.89, 'USD')).toBe('$1,234,567.89');
        });

        it('should handle negative amounts correctly', () => {
            // Act & Assert
            expect(formatAmount(-1000, 'USD')).toBe('-$1,000.00');
            expect(formatAmount(-1234.56, 'USD')).toBe('-$1,234.56');
            expect(formatAmount(-0.99, 'USD')).toBe('-$0.99');
        });

        it('should handle zero amounts correctly', () => {
            // Act & Assert
            expect(formatAmount(0, 'USD')).toBe('$0.00');
            expect(formatAmount(0, 'EUR')).toBe('€0.00');
            expect(formatAmount(0, 'GBP')).toBe('£0.00');
        });

        it('should handle very small amounts correctly', () => {
            // Act & Assert
            expect(formatAmount(0.01, 'USD')).toBe('$0.01');
            expect(formatAmount(0.001, 'USD')).toBe('$0.00'); // Rounded to 2 decimal places
            expect(formatAmount(0.009, 'USD')).toBe('$0.01'); // Rounded to 2 decimal places
        });

        it('should handle different currency codes', () => {
            // Act & Assert
            expect(formatAmount(1000, 'JPY')).toBe('¥1,000');
            expect(formatAmount(1000, 'CAD')).toBe('CA$1,000.00');
            expect(formatAmount(1000, 'AUD')).toBe('A$1,000.00');
            expect(formatAmount(1000, 'CHF')).toMatch(/^CHF\s1,000\.00$/);
        });

        it('should handle edge case amounts', () => {
            // Act & Assert
            expect(formatAmount(Number.MAX_SAFE_INTEGER, 'USD')).toBe('$9,007,199,254,740,991.00');
            expect(formatAmount(Number.MIN_SAFE_INTEGER, 'USD')).toBe('-$9,007,199,254,740,991.00');
        });

        it('should handle fractional amounts correctly', () => {
            // Act & Assert
            expect(formatAmount(1.5, 'USD')).toBe('$1.50');
            expect(formatAmount(1.25, 'USD')).toBe('$1.25');
            expect(formatAmount(1.125, 'USD')).toBe('$1.13'); // Rounded to 2 decimal places
        });

        it('should maintain consistent formatting for same currency', () => {
            // Act
            const amounts = [100, 1000, 10000, 100000];
            const formatted = amounts.map(amount => formatAmount(amount, 'USD'));

            // Assert
            expect(formatted[0]).toBe('$100.00');
            expect(formatted[1]).toBe('$1,000.00');
            expect(formatted[2]).toBe('$10,000.00');
            expect(formatted[3]).toBe('$100,000.00');
        });

        it('should handle invalid currency codes gracefully', () => {
            // Act & Assert
            expect(() => formatAmount(1000, 'INVALID')).toThrow('Invalid currency code');
            expect(() => formatAmount(1000, '')).toThrow('Invalid currency code');
        });

        it('should handle special characters in currency codes', () => {
            // Act & Assert
            expect(formatAmount(1000, 'BTC')).toMatch(/^BTC\s1,000\.00$/);
            expect(formatAmount(1000, 'ETH')).toMatch(/^ETH\s1,000\.00$/);
        });
    });

    describe('integration scenarios', () => {
        it('should work together in a typical payment flow', () => {
            // Simulate a payment flow
            const transactionId = generateTransactionId();
            const amount = 1234.56;
            const currency = 'USD';
            const formattedAmount = formatAmount(amount, currency);

            // Assert
            expect(transactionId).toMatch(/^txn_[a-z0-9]{9}$/);
            expect(formattedAmount).toBe('$1,234.56');
            expect(transactionId).toHaveLength(13);
        });

        it('should handle multiple transactions with different amounts and currencies', () => {
            const transactions = [
                { amount: 100, currency: 'USD' },
                { amount: 200, currency: 'EUR' },
                { amount: 300, currency: 'GBP' }
            ];

            transactions.forEach(transaction => {
                const id = generateTransactionId();
                const formatted = formatAmount(transaction.amount, transaction.currency);

                expect(id).toMatch(/^txn_[a-z0-9]{9}$/);
                expect(formatted).toContain(transaction.amount.toString());
                // Currency symbol/format may vary, so just check the amount is present
            });
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle very large numbers', () => {
            // Act & Assert
            expect(formatAmount(1e15, 'USD')).toBe('$1,000,000,000,000,000.00');
            expect(formatAmount(1e20, 'USD')).toBe('$100,000,000,000,000,000,000.00');
        });

        it('should handle very small numbers', () => {
            // Act & Assert
            expect(formatAmount(1e-10, 'USD')).toBe('$0.00'); // Very small numbers get rounded to 0
            expect(formatAmount(1e-5, 'USD')).toBe('$0.00'); // Very small numbers get rounded to 0
        });

        it('should handle NaN and Infinity gracefully', () => {
            // Act & Assert
            expect(formatAmount(NaN, 'USD')).toBe('$NaN');
            expect(formatAmount(Infinity, 'USD')).toBe('$∞');
            expect(formatAmount(-Infinity, 'USD')).toBe('-$∞');
        });

        it('should handle null and undefined gracefully', () => {
            // Act & Assert
            expect(formatAmount(null as any, 'USD')).toBe('$0.00');
            expect(formatAmount(undefined as any, 'USD')).toBe('$NaN');
        });
    });
});
