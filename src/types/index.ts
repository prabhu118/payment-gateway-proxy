export type PaymentProvider = 'stripe' | 'paypal';

export type TransactionStatus = 'success' | 'blocked' | 'error';

export type ChargeRequest = {
    amount: number;
    currency: string;
    source: string;
    email: string;
}

export type ChargeResponse = {
    transactionId: string;
    provider: PaymentProvider | null;
    status: TransactionStatus;
    riskScore: number;
    explanation: string;
}

export type Transaction = {
    id: string;
    timestamp: Date;
    request: ChargeRequest;
    response: ChargeResponse;
    metadata: {
        ipAddress?: string;
    };
}

export type FraudRule = {
    ruleName: string;
    riskScore: number;
    condition: (request: ChargeRequest) => boolean;
}

export type RiskAssessmentResult = {
    score: number;
    triggeredRules: string[];
}