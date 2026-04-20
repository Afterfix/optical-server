class SettingsRepository {
    // constructor removed

    async getByUserId(db, userId) {
        const { rows } = await db.query(
            'SELECT * FROM settings WHERE user_id = $1',
            [userId]
        );
        return rows[0];
    }

    async createOrUpdate(db, userId, tenantId, settingsData) {
        const { app_name, logo, sidebar_labels, country, user_settings } = settingsData;

        const { rows } = await db.query(
            `
            INSERT INTO settings (user_id, tenant_id, app_name, logo, sidebar_labels, country, user_settings)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id) DO UPDATE 
            SET
                app_name = COALESCE(EXCLUDED.app_name, settings.app_name),
                logo = COALESCE(EXCLUDED.logo, settings.logo),
                sidebar_labels = COALESCE(EXCLUDED.sidebar_labels, settings.sidebar_labels),
                country = COALESCE(EXCLUDED.country, settings.country),
                user_settings = COALESCE(EXCLUDED.user_settings, settings.user_settings),
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
            `,
            [userId, tenantId, app_name, logo, sidebar_labels, country, user_settings]
        );
        return rows[0];
    }
}

module.exports = SettingsRepository;