class ReportFieldPermissionsValidator {
  _isStringArray(arr) {
    return Array.isArray(arr) && arr.every((item) => typeof item === 'string');
  }

  createValidator = (req, res, next) => {
    const { user_id, ...fields } = req.body;

    if (user_id === undefined || user_id === null || typeof user_id !== 'number') {
      return res.status(400).json({
        error: `Missing or invalid required field: user_id (must be a number)`,
      });
    }

    for (const key in fields) {
      if (key.endsWith('_fields')) {
        if (!this._isStringArray(fields[key])) {
          return res
            .status(400)
            .json({ error: `${key} must be an array of strings.` });
        }
      }
    }

    next();
  };

  updateValidator = (req, res, next) => {
    const { ...fields } = req.body;

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty.' });
    }

    for (const key in fields) {
      if (key.endsWith('_fields')) {
        if (!this._isStringArray(fields[key])) {
          return res
            .status(400)
            .json({ error: `${key} must be an array of strings.` });
        }
      }
    }

    if ('user_id' in req.body || 'tenant_id' in req.body) {
      return res
        .status(400)
        .json({ error: 'user_id and tenant_id cannot be changed.' });
    }

    next();
  };

  idParamValidator = (req, res, next) => {
    const id = req.params.id;
    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        error: 'Invalid or missing ID in URL parameter',
      });
    }
    next();
  };
}

module.exports = ReportFieldPermissionsValidator;