class RoleValidator {

    validateRolePayload = (req, res, next) => {
        const { name, permissions } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({
                error: 'The "name" field is required and must be a non-empty string.',
            });
        }

        if (!permissions || typeof permissions !== 'object' || Object.keys(permissions).length === 0) {
            return res.status(400).json({
                error: 'The "permissions" field is required and must be a non-empty object.',
            });
        }

        next();
    };

    createValidator = (req, res, next) => {
        this.validateRolePayload(req, res, next);
    };

    updateValidator = (req, res, next) => {
        this.validateRolePayload(req, res, next);
    };
}

module.exports = RoleValidator;