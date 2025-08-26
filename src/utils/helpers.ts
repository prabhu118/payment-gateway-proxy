export function generateTransactionId(): string {
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `txn_${randomPart}`;
}