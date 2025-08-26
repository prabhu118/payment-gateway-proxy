import { Transaction } from '../types';

export class TransactionDataService {
    private transactions: Map<string, Transaction> = new Map();

    /**
     * Store a transaction in the Map
     * @param transaction - The transaction to store
     * @returns The stored transaction
     */
    storeTransaction(transaction: Transaction): Transaction {
        this.transactions.set(transaction.id, transaction);
        return transaction;
    }

    /**
     * Get a transaction by its ID
     * @param id - The transaction ID
     * @returns The transaction if found, undefined otherwise
     */
    getTransactionById(id: string): Transaction | undefined {
        return this.transactions.get(id);
    }

    /**
     * Get all transactions
     * @returns Array of all transactions
     */
    getAllTransactions(): Transaction[] {
        return Array.from(this.transactions.values());
    }

    /**
     * Get the total count of transactions
     * @returns The number of transactions stored
     */
    getTransactionCount(): number {
        return this.transactions.size;
    }

    /**
     * Check if a transaction exists by ID
     * @param id - The transaction ID
     * @returns True if transaction exists, false otherwise
     */
    hasTransaction(id: string): boolean {
        return this.transactions.has(id);
    }

    /**
     * Delete a transaction by ID
     * @param id - The transaction ID
     * @returns True if transaction was deleted, false if it didn't exist
     */
    deleteTransaction(id: string): boolean {
        return this.transactions.delete(id);
    }

    /**
     * Clear all transactions
     */
    clearAllTransactions(): void {
        this.transactions.clear();
    }

    /**
     * Get transactions by status
     * @param status - The transaction status to filter by
     * @returns Array of transactions with the specified status
     */
    getTransactionsByStatus(status: string): Transaction[] {
        return this.getAllTransactions().filter(
            transaction => transaction.response.status === status
        );
    }
}
