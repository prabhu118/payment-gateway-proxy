import { TransactionDataService } from '../../services/transactionDataService';
import { Transaction, ChargeRequest, ChargeResponse } from '../../types';

describe('TransactionDataService', () => {
    let transactionDataService: TransactionDataService;
    let mockTransaction: Transaction;
    let mockChargeRequest: ChargeRequest;
    let mockChargeResponse: ChargeResponse;

    beforeEach(() => {
        transactionDataService = new TransactionDataService();

        mockChargeRequest = {
            amount: 1000,
            currency: 'USD',
            source: 'card_123',
            email: 'user@example.com'
        };

        mockChargeResponse = {
            transactionId: 'txn-123',
            provider: 'stripe',
            status: 'success',
            riskScore: 0.2,
            explanation: 'Payment processed successfully'
        };

        mockTransaction = {
            id: 'txn-123',
            timestamp: new Date('2024-01-01T10:00:00Z'),
            request: mockChargeRequest,
            response: mockChargeResponse,
            metadata: {
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0 Test Browser'
            }
        };
    });

    describe('storeTransaction', () => {
        it('should store a transaction successfully', () => {
            // Act
            const result = transactionDataService.storeTransaction(mockTransaction);

            // Assert
            expect(result).toEqual(mockTransaction);
            expect(transactionDataService.getTransactionById('txn-123')).toEqual(mockTransaction);
        });

        it('should overwrite existing transaction with same ID', () => {
            // Arrange
            transactionDataService.storeTransaction(mockTransaction);

            const updatedTransaction: Transaction = {
                ...mockTransaction,
                response: {
                    ...mockChargeResponse,
                    status: 'error'
                }
            };

            // Act
            const result = transactionDataService.storeTransaction(updatedTransaction);

            // Assert
            expect(result).toEqual(updatedTransaction);
            expect(transactionDataService.getTransactionById('txn-123')).toEqual(updatedTransaction);
            expect(transactionDataService.getTransactionCount()).toBe(1);
        });

        it('should store multiple transactions with different IDs', () => {
            // Arrange
            const transaction2: Transaction = {
                ...mockTransaction,
                id: 'txn-456',
                response: {
                    ...mockChargeResponse,
                    transactionId: 'txn-456'
                }
            };

            // Act
            transactionDataService.storeTransaction(mockTransaction);
            transactionDataService.storeTransaction(transaction2);

            // Assert
            expect(transactionDataService.getTransactionCount()).toBe(2);
            expect(transactionDataService.getTransactionById('txn-123')).toEqual(mockTransaction);
            expect(transactionDataService.getTransactionById('txn-456')).toEqual(transaction2);
        });
    });

    describe('getTransactionById', () => {
        it('should return transaction when it exists', () => {
            // Arrange
            transactionDataService.storeTransaction(mockTransaction);

            // Act
            const result = transactionDataService.getTransactionById('txn-123');

            // Assert
            expect(result).toEqual(mockTransaction);
        });

        it('should return undefined when transaction does not exist', () => {
            // Act
            const result = transactionDataService.getTransactionById('non-existent');

            // Assert
            expect(result).toBeUndefined();
        });

        it('should return undefined for empty string ID', () => {
            // Act
            const result = transactionDataService.getTransactionById('');

            // Assert
            expect(result).toBeUndefined();
        });

        it('should return undefined for null/undefined ID', () => {
            // Act
            const result1 = transactionDataService.getTransactionById(null as any);
            const result2 = transactionDataService.getTransactionById(undefined as any);

            // Assert
            expect(result1).toBeUndefined();
            expect(result2).toBeUndefined();
        });
    });

    describe('getAllTransactions', () => {
        it('should return empty array when no transactions exist', () => {
            // Act
            const result = transactionDataService.getAllTransactions();

            // Assert
            expect(result).toEqual([]);
        });

        it('should return all stored transactions', () => {
            // Arrange
            const transaction2: Transaction = {
                ...mockTransaction,
                id: 'txn-456',
                response: {
                    ...mockChargeResponse,
                    transactionId: 'txn-456'
                }
            };

            transactionDataService.storeTransaction(mockTransaction);
            transactionDataService.storeTransaction(transaction2);

            // Act
            const result = transactionDataService.getAllTransactions();

            // Assert
            expect(result).toHaveLength(2);
            expect(result).toContain(mockTransaction);
            expect(result).toContain(transaction2);
        });

        it('should return transactions in insertion order', () => {
            // Arrange
            const transaction2: Transaction = {
                ...mockTransaction,
                id: 'txn-456',
                response: {
                    ...mockChargeResponse,
                    transactionId: 'txn-456'
                }
            };

            transactionDataService.storeTransaction(mockTransaction);
            transactionDataService.storeTransaction(transaction2);

            // Act
            const result = transactionDataService.getAllTransactions();

            // Assert
            expect(result[0]).toEqual(mockTransaction);
            expect(result[1]).toEqual(transaction2);
        });
    });

    describe('getTransactionCount', () => {
        it('should return 0 when no transactions exist', () => {
            // Act
            const result = transactionDataService.getTransactionCount();

            // Assert
            expect(result).toBe(0);
        });

        it('should return correct count after storing transactions', () => {
            // Arrange
            transactionDataService.storeTransaction(mockTransaction);

            // Act
            const result = transactionDataService.getTransactionCount();

            // Assert
            expect(result).toBe(1);
        });

        it('should return correct count after overwriting transaction', () => {
            // Arrange
            transactionDataService.storeTransaction(mockTransaction);
            transactionDataService.storeTransaction(mockTransaction); // Overwrite

            // Act
            const result = transactionDataService.getTransactionCount();

            // Assert
            expect(result).toBe(1);
        });
    });

    describe('hasTransaction', () => {
        it('should return false when transaction does not exist', () => {
            // Act
            const result = transactionDataService.hasTransaction('non-existent');

            // Assert
            expect(result).toBe(false);
        });

        it('should return true when transaction exists', () => {
            // Arrange
            transactionDataService.storeTransaction(mockTransaction);

            // Act
            const result = transactionDataService.hasTransaction('txn-123');

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for empty string ID', () => {
            // Act
            const result = transactionDataService.hasTransaction('');

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('deleteTransaction', () => {
        it('should return false when deleting non-existent transaction', () => {
            // Act
            const result = transactionDataService.deleteTransaction('non-existent');

            // Assert
            expect(result).toBe(false);
        });

        it('should return true when deleting existing transaction', () => {
            // Arrange
            transactionDataService.storeTransaction(mockTransaction);

            // Act
            const result = transactionDataService.deleteTransaction('txn-123');

            // Assert
            expect(result).toBe(true);
            expect(transactionDataService.hasTransaction('txn-123')).toBe(false);
            expect(transactionDataService.getTransactionCount()).toBe(0);
        });

        it('should not affect other transactions when deleting one', () => {
            // Arrange
            const transaction2: Transaction = {
                ...mockTransaction,
                id: 'txn-456',
                response: {
                    ...mockChargeResponse,
                    transactionId: 'txn-456'
                }
            };

            transactionDataService.storeTransaction(mockTransaction);
            transactionDataService.storeTransaction(transaction2);

            // Act
            transactionDataService.deleteTransaction('txn-123');

            // Assert
            expect(transactionDataService.hasTransaction('txn-123')).toBe(false);
            expect(transactionDataService.hasTransaction('txn-456')).toBe(true);
            expect(transactionDataService.getTransactionCount()).toBe(1);
        });
    });

    describe('clearAllTransactions', () => {
        it('should clear all transactions', () => {
            // Arrange
            const transaction2: Transaction = {
                ...mockTransaction,
                id: 'txn-456',
                response: {
                    ...mockChargeResponse,
                    transactionId: 'txn-456'
                }
            };

            transactionDataService.storeTransaction(mockTransaction);
            transactionDataService.storeTransaction(transaction2);

            // Act
            transactionDataService.clearAllTransactions();

            // Assert
            expect(transactionDataService.getTransactionCount()).toBe(0);
            expect(transactionDataService.getAllTransactions()).toEqual([]);
            expect(transactionDataService.hasTransaction('txn-123')).toBe(false);
            expect(transactionDataService.hasTransaction('txn-456')).toBe(false);
        });

        it('should work when no transactions exist', () => {
            // Act
            transactionDataService.clearAllTransactions();

            // Assert
            expect(transactionDataService.getTransactionCount()).toBe(0);
            expect(transactionDataService.getAllTransactions()).toEqual([]);
        });
    });

    describe('getTransactionsByStatus', () => {
        it('should return empty array when no transactions match status', () => {
            // Act
            const result = transactionDataService.getTransactionsByStatus('success');

            // Assert
            expect(result).toEqual([]);
        });

        it('should return transactions matching specific status', () => {
            // Arrange
            const successTransaction = mockTransaction;
            const errorTransaction: Transaction = {
                ...mockTransaction,
                id: 'txn-456',
                response: {
                    ...mockChargeResponse,
                    transactionId: 'txn-456',
                    status: 'error'
                }
            };
            const blockedTransaction: Transaction = {
                ...mockTransaction,
                id: 'txn-789',
                response: {
                    ...mockChargeResponse,
                    transactionId: 'txn-789',
                    status: 'blocked'
                }
            };

            transactionDataService.storeTransaction(successTransaction);
            transactionDataService.storeTransaction(errorTransaction);
            transactionDataService.storeTransaction(blockedTransaction);

            // Act
            const successTransactions = transactionDataService.getTransactionsByStatus('success');
            const errorTransactions = transactionDataService.getTransactionsByStatus('error');
            const blockedTransactions = transactionDataService.getTransactionsByStatus('blocked');

            // Assert
            expect(successTransactions).toHaveLength(1);
            expect(successTransactions[0]).toEqual(successTransaction);

            expect(errorTransactions).toHaveLength(1);
            expect(errorTransactions[0]).toEqual(errorTransaction);

            expect(blockedTransactions).toHaveLength(1);
            expect(blockedTransactions[0]).toEqual(blockedTransaction);
        });

        it('should return multiple transactions with same status', () => {
            // Arrange
            const transaction2: Transaction = {
                ...mockTransaction,
                id: 'txn-456',
                response: {
                    ...mockChargeResponse,
                    transactionId: 'txn-456'
                }
            };

            transactionDataService.storeTransaction(mockTransaction);
            transactionDataService.storeTransaction(transaction2);

            // Act
            const result = transactionDataService.getTransactionsByStatus('success');

            // Assert
            expect(result).toHaveLength(2);
            expect(result).toContain(mockTransaction);
            expect(result).toContain(transaction2);
        });

        it('should handle case-sensitive status matching', () => {
            // Arrange
            transactionDataService.storeTransaction(mockTransaction);

            // Act
            const result = transactionDataService.getTransactionsByStatus('SUCCESS');

            // Assert
            expect(result).toHaveLength(0); // Should not match due to case sensitivity
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete transaction lifecycle', () => {
            // Store transaction
            transactionDataService.storeTransaction(mockTransaction);
            expect(transactionDataService.getTransactionCount()).toBe(1);
            expect(transactionDataService.hasTransaction('txn-123')).toBe(true);

            // Update transaction
            const updatedTransaction: Transaction = {
                ...mockTransaction,
                response: {
                    ...mockChargeResponse,
                    status: 'error'
                }
            };
            transactionDataService.storeTransaction(updatedTransaction);
            expect(transactionDataService.getTransactionCount()).toBe(1);
            expect(transactionDataService.getTransactionById('txn-123')).toEqual(updatedTransaction);

            // Delete transaction
            const deleteResult = transactionDataService.deleteTransaction('txn-123');
            expect(deleteResult).toBe(true);
            expect(transactionDataService.getTransactionCount()).toBe(0);
            expect(transactionDataService.hasTransaction('txn-123')).toBe(false);
        });

        it('should maintain data integrity across operations', () => {
            // Arrange
            const transactions = [
                { ...mockTransaction, id: 'txn-1' },
                { ...mockTransaction, id: 'txn-2' },
                { ...mockTransaction, id: 'txn-3' }
            ];

            // Store multiple transactions
            transactions.forEach(txn => transactionDataService.storeTransaction(txn));
            expect(transactionDataService.getTransactionCount()).toBe(3);

            // Delete middle transaction
            transactionDataService.deleteTransaction('txn-2');
            expect(transactionDataService.getTransactionCount()).toBe(2);
            expect(transactionDataService.hasTransaction('txn-1')).toBe(true);
            expect(transactionDataService.hasTransaction('txn-2')).toBe(false);
            expect(transactionDataService.hasTransaction('txn-3')).toBe(true);

            // Clear all
            transactionDataService.clearAllTransactions();
            expect(transactionDataService.getTransactionCount()).toBe(0);
            expect(transactionDataService.getAllTransactions()).toEqual([]);
        });
    });
});
