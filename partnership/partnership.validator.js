class PartnershipValidator {
  createValidator = (req, res, next) => {
    const requiredFields = [
      'partner_id',
      'contribution',
      'profit_share',
      'from_account',
      'contribution_payment_status',
      'profit_share_payment_status'
    ];

    const missingFields = requiredFields.filter(
      (field) =>
        req.body[field] === undefined || 
        req.body[field] === null || 
        (typeof req.body[field] === 'string' && req.body[field].trim() === '')
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    next();
  };

  updateValidator = (req, res, next) => {
    this.createValidator(req, res, next);
  };
}

module.exports = PartnershipValidator;