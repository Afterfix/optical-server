class ModeOfPaymentValidator {
  createValidator = (req, res, next) => {
    const { name } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({
        error: `Missing required field: name`,
      });
    }

    next();
  };

  updateValidator = (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'No fields to update.',
      });
    }

    if (req.body.name && String(req.body.name).trim() === '') {
        return res.status(400).json({
            error: `Field 'name' cannot be empty.`
        });
    }

    next();
  };
}

module.exports = ModeOfPaymentValidator;