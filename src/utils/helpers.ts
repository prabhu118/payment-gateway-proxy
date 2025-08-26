export function generateTransactionId(): string {
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `txn_${randomPart}`;
}

export function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}