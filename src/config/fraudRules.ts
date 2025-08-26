import { ChargeRequest, FraudRule } from "../types";

export const fraudRules: FraudRule[] = [
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