// --- invoiceNumber.validator.js ---
class InvoiceNumberValidator {
  getValidator = (req, res, next) => {
    // Safely check query or body using ?. 
    // This prevents the "reading 'type' of undefined" crash
    const type = req.query?.type || req.body?.type;

    // We allow missing type for listing all sequences
    // So we don't return 400 here if type is missing.
    // Validation can still be done if type IS provided, but for now we just proceed.

    next();
  };

  generatorValidator = (req, res, next) => {
    // Safely check body
    const type = req.body?.type;

    if (!type) {
      return res.status(400).json({
        error: "Missing required field in body: type",
      });
    }

    next();
  };
}

module.exports = InvoiceNumberValidator;