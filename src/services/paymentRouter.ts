import { PaymentProvider } from '../types';
import { providerConfig } from '../config/fraudRules';

export class PaymentRouterService {
    /**
     * Routes the payment to the appropriate provider based on the risk score
     * @param riskScore - The risk score of the transaction
     * @returns The payment provider to use, or null if the transaction should be blocked
     */
    routePayment(riskScore: number): PaymentProvider | null {
        if (riskScore < providerConfig.stripe.maxRiskScore) {
            return 'stripe';
        } else if (riskScore < providerConfig.paypal.maxRiskScore) {
            return 'paypal';
        }
        return null; // Block transaction
    }

    /**
     * Simulates a payment response with a boolean value
     * @param successRate - Probability of success (0.0 to 1.0), defaults to 0.9 (90% success rate)
     * @param provider - The payment provider
     * @returns boolean - true for successful payment, false for failed payment
     */
    simulatePayment(_provider: PaymentProvider, successRate: number = 0.9): boolean {
        const validSuccessRate = Math.max(0, Math.min(1, successRate));
        const randomValue = Math.random();
        return randomValue < validSuccessRate;
    }
}