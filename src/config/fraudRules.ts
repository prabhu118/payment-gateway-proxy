import { ChargeRequest, FraudRule } from "../types";

export const fraudRules: FraudRule[] = [
    {
        ruleName: 'Large Amount',
        riskScore: 0.3,
        condition: (request: ChargeRequest) => request.amount > 50000 // > $500
    },
    {
        ruleName: 'Very Large Amount',
        riskScore: 0.4,
        condition: (request: ChargeRequest) => request.amount > 100000 // > $1000
    },
    {
        ruleName: 'Suspicious Domain',
        riskScore: 0.4,
        condition: (request: ChargeRequest) => {
            const suspiciousDomains = ['.ru', '.tk', '.ml', 'test.com', '10minutemail', 'mailinator'];
            return suspiciousDomains.some(domain => request.email.toLowerCase().includes(domain));
        }
    },
    {
        ruleName: 'Invalid Email Format',
        riskScore: 0.2,
        condition: (request: ChargeRequest) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return !emailRegex.test(request.email);
        }
    },
    {
        ruleName: 'Test Token',
        riskScore: 0.1,
        condition: (request: ChargeRequest) => request.source.includes('test')
    }
];

export const providerConfig = {
    stripe: {
        name: 'Stripe',
        maxRiskScore: 0.4
    },
    paypal: {
        name: 'PayPal',
        maxRiskScore: 0.5
    }
};