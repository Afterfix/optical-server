class SettingsValidator {
  updateValidator = (req, res, next) => {
    const { app_name, sidebar_labels, country, user_settings } = req.body;

    if (app_name !== undefined && (typeof app_name !== 'string' || app_name.trim() === '')) {
      return res.status(400).json({ error: 'Field "app_name" must be a non-empty string.' });
    }

    if (sidebar_labels !== undefined && (typeof sidebar_labels !== 'object' || sidebar_labels === null)) {
      return res.status(400).json({ error: 'Field "sidebar_labels" must be a valid object.' });
    }

    if (country !== undefined && (typeof country !== 'string' || country.trim() === '')) {
      return res.status(400).json({ error: 'Field "country" must be a valid non-empty string.' });
    }

    if (user_settings !== undefined && (typeof user_settings !== 'object' || user_settings === null)) {
      return res.status(400).json({ error: 'Field "user_settings" must be a valid object.' });
    }

    next();
  };
}

module.exports = SettingsValidator;