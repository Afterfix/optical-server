class CustomerValidator {
  createValidator(req, res, next) {
    if (!req.body.name) return res.status(400).json({ error: "Name is required" });
    next();
  }
}
module.exports = CustomerValidator;