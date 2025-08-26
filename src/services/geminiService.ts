import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger';
import { ChargeRequest, PaymentProvider, TransactionStatus } from '../types';
import { formatAmount } from '../utils/helpers';

export interface LLMConfig {
    apiKey?: string;
    model?: string;
    fallbackToSimulated?: boolean;
}

export class GeminiService {
    private genAI: GoogleGenAI | null;
    private config: Required<LLMConfig>;

    constructor(geminiConfig: LLMConfig = {}) {

        this.config = {
            apiKey: process.env.GEMINI_API_KEY || '',
            model: geminiConfig.model || 'gemini-2.0-flash',
            fallbackToSimulated: geminiConfig.fallbackToSimulated ?? true,
        };

        if (this.config.apiKey) {
            try {
                this.genAI = new GoogleGenAI({ apiKey: this.config.apiKey });
                logger.info('Gemini Service initialized', { model: this.config.model });
            } catch (err) {
                logger.error('Failed to initialize Gemini client — falling back to simulated responses');
                this.genAI = null;
            }
        } else {
            logger.error('Failed to initialize Gemini client — falling back to simulated responses');
            this.genAI = null;
        }
    }

    /**
     * Generates a description for a charge request
     * @param request - The charge request
     * @param riskScore - The risk score
     * @param provider - The payment provider
     * @param status - The transaction status
     * @param triggeredRules - The triggered rules
     * @returns The description
     */
    async generateDescriptionFromTags(
        request: ChargeRequest,
        riskScore: number,
        provider: PaymentProvider | null,
        status: TransactionStatus,
        triggeredRules: string[]
    ): Promise<string> {

        let explanation: string;

        if (this.genAI) {
            try {
                explanation = await this.generateDescription(request, riskScore, provider, status, triggeredRules);
                logger.info('Generated explanation using Gemini', {
                    transactionAmount: request.amount,
                    riskScore,
                    status,
                    model: this.config.model,
                    responseLength: explanation?.length
                });

                if (!explanation) {
                    explanation = this.generateSimulatedExplanation(request, riskScore, provider, status, triggeredRules);
                    logger.info('Used fallback simulated explanation');
                }

            } catch (error) {
                logger.error('Gemini API call failed', error);
                if (this.config.fallbackToSimulated) {
                    explanation = this.generateSimulatedExplanation(request, riskScore, provider, status, triggeredRules);
                    logger.info('Used fallback simulated explanation');
                } else {
                    throw new Error('LLM service unavailable and fallback disabled');
                }
            }
        } else {
            explanation = this.generateSimulatedExplanation(request, riskScore, provider, status, triggeredRules);
        }

        return explanation;
    }

    /**
     * Generates a description for a charge request
     * @param request - The charge request
     * @param riskScore - The risk score
     * @param provider - The payment provider
     * @param status - The transaction status
     * @param triggeredRules - The triggered rules
     * @returns The description
     */
    private async generateDescription(
        request: ChargeRequest,
        riskScore: number,
        provider: PaymentProvider | null,
        status: TransactionStatus,
        triggeredRules: string[]
    ): Promise<string> {
        const prompt = this.buildPrompt(request, riskScore, provider, status, triggeredRules);

        try {
            if (this.genAI) {
                const response = await this.genAI.models.generateContent({
                    model: this.config.model,
                    contents: prompt,
                });

                return response?.text || "";
            }
            return Promise.reject('Gemini client not initialized');
        } catch (modelError) {
            logger.warn('Text generation model failed, trying text completion', modelError);
            return Promise.reject('Gemini client not initialized');
        }
    }

    /**
     * Builds the prompt for the Gemini model
     * @param request - The charge request
     * @param riskScore - The risk score
     * @param provider - The payment provider
     * @param status - The transaction status
     * @param triggeredRules - The triggered rules
     * @returns The prompt string
     */
    private buildPrompt(
        request: ChargeRequest,
        riskScore: number,
        provider: PaymentProvider | null,
        status: TransactionStatus,
        triggeredRules: string[]
    ): string {

        const amountFormatted = formatAmount(request.amount, request.currency);

        const context = status === 'blocked' ? 'blocked due to high risk' :
            status === 'success' ? `approved and routed to ${provider}` : 'failed processing';

        const riskFactors = triggeredRules.length > 0 ? triggeredRules.join(', ') : 'none detected';

        return `Explain payment decision: ${amountFormatted} transaction ${context}. Risk score: ${riskScore}/1.0. Risk factors: ${riskFactors}. Provide professional merchant explanation in 2-3 sentences.`;
    }

    /**
     * Generates a simulated explanation for a charge request
     * @param request - The charge request
     * @param riskScore - The risk score
     * @param provider - The payment provider
     * @param status - The transaction status
     * @param triggeredRules - The triggered rules
     * @returns The simulated explanation
     */
    private generateSimulatedExplanation(
        request: ChargeRequest,
        riskScore: number,
        provider: PaymentProvider | null,
        status: TransactionStatus,
        triggeredRules: string[]
    ): string {

        const amountFormatted = formatAmount(request.amount, request.currency);

        if (status === 'blocked') {
            let explanation = `Transaction blocked due to elevated risk score of ${riskScore}. `;
            if (triggeredRules.length > 0) {
                explanation += `Risk factors detected: ${triggeredRules.join(', ')}. `;
            }
            explanation += `The ${amountFormatted} payment exceeded our risk tolerance thresholds. Please verify transaction details and consider alternative payment methods.`;
            return explanation;
        }

        if (status === 'success') {
            const riskLevel = riskScore <= 0.2 ? 'low' : riskScore <= 0.3 ? 'minimal' : 'moderate';
            // const riskLevel = riskScore < 0.2 ? 'minimal' : riskScore < 0.4 ? 'low' : 'moderate';
            let explanation = `Payment of ${amountFormatted} successfully processed through ${provider?.toUpperCase()} with ${riskLevel} risk assessment (${riskScore}). `;

            if (triggeredRules.length > 0) {
                explanation += `Some risk indicators were present (${triggeredRules.join(', ')}) but remained within acceptable parameters. `;
            }

            explanation += `Transaction routed to ${provider} based on our risk-optimized processing rules.`;
            return explanation;
        }

        return `Payment processing encountered an issue for the ${amountFormatted} transaction. Risk assessment: ${riskScore}. Our technical team has been notified. Please retry or contact support.`;
    }
}
