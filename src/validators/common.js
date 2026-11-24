// Validation rule shared by routes that take an id in the URL.
import { param } from 'express-validator';

export function idParam(name = 'id') { return param(name).isMongoId().withMessage(`${name} must be a valid id`); }
