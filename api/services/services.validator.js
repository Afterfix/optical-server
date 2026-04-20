class ServicesValidator {
  createValidator = (req, res, next) => {
    if (req.user.role === 'super_admin' && !req.body.tenant_id) {
      return res.status(400).json({ error: "Missing required field: tenant_id" });
    }

    const requiredFields = ['customer_id', 'description'];
    const missingFields = requiredFields.filter(field => !req.body[field] || req.body[field].toString().trim() === '');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing or empty required fields: ${missingFields.join(', ')}`
      });
    }

    if (req.body.status && !['pending', 'completed'].includes(req.body.status)) {
        return res.status(400).json({ error: "Status must be either 'pending' or 'completed'" });
    }

    next();
  };

  updateValidator = (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'At least one field must be provided for update.' });
    }
    
    if (req.body.status && !['pending', 'completed'].includes(req.body.status)) {
        return res.status(400).json({ error: "Status must be either 'pending' or 'completed'" });
    }
    
    next();
  };
}

module.exports = ServicesValidator;