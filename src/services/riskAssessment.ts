import { ChargeRequest, RiskAssessmentResult } from "../types";
import { fraudRules } from "../config/fraudRules";

export class RiskAssessmentService {
    calculateRisk(request: ChargeRequest): RiskAssessmentResult {

        let totalScore: number = 0;
        const triggeredRules: string[] = [];

        for (const rule of fraudRules) {
            if (rule.condition(request)) {
                totalScore += rule.riskScore;
                triggeredRules.push(rule.ruleName);
            }
        }

        const score: number = Math.min(totalScore, 1.0);

        return { score, triggeredRules }
    }
}