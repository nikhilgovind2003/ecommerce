// Validation rule shared by routes that take an id in the URL.
import { param } from 'express-validator';

export const idParam = (name = 'id') => param(name).isMongoId().withMessage(`${name} must be a valid id`);
