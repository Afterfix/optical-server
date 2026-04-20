class PartnerValidator {
  createValidator = (req, res, next) => {
    const requiredFields = ['name', 'phone'];

    const missingFields = requiredFields.filter(
      (field) =>
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ''
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    if (req.body.addAccount) {
      // Check for a plural, array-based key
      if (!req.body.accounts || !Array.isArray(req.body.accounts)) {
        return res.status(400).json({
          error: 'When addAccount is true, an "accounts" array is required.',
        });
      }

      // Loop through each account in the array and validate it
      for (const account of req.body.accounts) {
        const requiredAccountFields = ['name', 'type'];
        const missingAccountFields = requiredAccountFields.filter(
          (field) =>
            account[field] === undefined ||
            account[field] === null ||
            account[field] === ''
        );

        if (missingAccountFields.length > 0) {
          return res.status(400).json({
            error: `Missing required account fields in one of the accounts: ${missingAccountFields.join(', ')}`,
          });
        }

        const allowedTypes = ['cash', 'bank'];
        if (!allowedTypes.includes(account.type)) {
          return res.status(400).json({
            error: "Invalid account type found. Must be 'cash' or 'bank'.",
          });
        }
      }
    }

    next();
  };

  updateValidator = (req, res, next) => {
    this.createValidator(req, res, next);
  };
}

module.exports = PartnerValidator;