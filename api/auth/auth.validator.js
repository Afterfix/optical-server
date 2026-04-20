// features/auth/auth.validator.js
const { body, validationResult } = require("express-validator");

const registerValidator = [
  body("username").trim().notEmpty().withMessage("Username is required."),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long."),
  body("tenant_id").optional().isInt(),
  body("role_id").optional().isInt(),
];


const loginValidator = [
  body("username").notEmpty().withMessage("Username is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  registerValidator,
  loginValidator,
  validate,
};
