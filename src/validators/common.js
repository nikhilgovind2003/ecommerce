const { param } = require('express-validator');

exports.idParam = (name = 'id') => param(name).isMongoId().withMessage(`${name} must be a valid id`);
