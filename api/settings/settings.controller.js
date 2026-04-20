class SettingsController {
    constructor(service) {
        this.service = service;
    }

    async get(req, res, next) {
        try {
            const settings = await this.service.getSettings(req.user, req.db);
            res.json(settings);
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const updatedSettings = await this.service.updateSettings(
                req.user,
                req.body,
                req.db
            );
            res.json(updatedSettings);
        } catch (error) {
            next(error);
        }
    }

    // This is updated - New method for admin
    async getSettingsForUser(req, res, next) {
        try {
            const { userId } = req.params;
            const settings = await this.service.getSettingsByUserId(userId, req.db);
            res.json(settings);
        } catch (error) {
            next(error);
        }
    }

    // This is updated - New method for admin
    async updateSettingsForUser(req, res, next) {
        try {
            const { userId } = req.params;
            const updatedSettings = await this.service.updateSettingsByUserId(
                userId,
                req.body,
                req.db
            );
            res.json(updatedSettings);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = SettingsController;