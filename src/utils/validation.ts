import Joi from 'joi';

export const chargeRequestSchema = Joi.object({
    amount: Joi.number().integer().min(1).max(1000000).required(),
    currency: Joi.string().length(3).uppercase().required(),
    source: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().max(254).required()
}).required();