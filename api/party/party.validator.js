// party.validator.js

class PartyValidator {
  createValidator = (req, res, next) => {
    const { name, type } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({
        error: `Missing required field: name`,
      });
    }

    if (!type || !['customer', 'supplier'].includes(type)) {
      return res.status(400).json({
        error: `Missing or invalid required field: type. Must be 'customer' or 'supplier'.`,
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

    if (req.body.type) {
        return res.status(400).json({
            error: 'Changing the party type is not allowed.'
        });
    }

    next();
  };
}

module.exports = PartyValidator;