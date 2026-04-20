class PrintSettingsRepository {

  async getByTenantId(db, tenantId) {
    // Select show_qr_code only if column exists (backward-compatible before migration)
    let row;
    try {
      const { rows } = await db.query(
        `SELECT 
          tenant_id, company_name, email, phone, store, address, 
          header_image_url, image_height, image_width, 
          tr_number, footer_message, print_type,
          qr_image_url, qr_width, qr_height, show_qr_code,
          show_arabic_translations
         FROM print_settings WHERE tenant_id = $1`,
        [tenantId]
      );
      row = rows[0];
    } catch (err) {
      if (err.code === '42703' && err.message && err.message.includes('show_qr_code')) {
        const { rows } = await db.query(
          `SELECT 
            tenant_id, company_name, email, phone, store, address, 
            header_image_url, image_height, image_width, 
            tr_number, footer_message, print_type,
            qr_image_url, qr_width, qr_height,
            show_arabic_translations
           FROM print_settings WHERE tenant_id = $1`,
          [tenantId]
        );
        row = rows[0] ? { ...rows[0], show_qr_code: !!rows[0].qr_image_url } : rows[0];
      } else {
        throw err;
      }
    }
    return row;
  }

  async createOrUpdate(db, tenantId, settingsData) {
    const { 
      company_name, email, phone, address, store, 
      header_image_url, image_height, image_width,
      tr_number, footer_message, print_type,
      qr_image_url, qr_width, qr_height, show_qr_code,
      show_arabic_translations
    } = settingsData;

    const showArabicBool = show_arabic_translations === 'true';
    const showQrBool = show_qr_code === 'true' || show_qr_code === true;

    const paramsWithShowQr = [
      tenantId, company_name, email, phone, address, store, 
      header_image_url, image_height, image_width, 
      tr_number, footer_message, print_type,
      qr_image_url, qr_width, qr_height, showQrBool,
      showArabicBool
    ];
    const sqlWithShowQr = `
      INSERT INTO print_settings (
        tenant_id, company_name, email, phone, address, store,
        header_image_url, image_height, image_width,
        tr_number, footer_message, print_type,
        qr_image_url, qr_width, qr_height, show_qr_code,
        show_arabic_translations
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (tenant_id) DO UPDATE SET
        company_name = COALESCE($2, print_settings.company_name),
        email = COALESCE($3, print_settings.email),
        phone = COALESCE($4, print_settings.phone),
        address = COALESCE($5, print_settings.address),
        store = COALESCE($6, print_settings.store),
        header_image_url = COALESCE($7, print_settings.header_image_url),
        image_height = COALESCE($8, print_settings.image_height),
        image_width = COALESCE($9, print_settings.image_width),
        tr_number = COALESCE($10, print_settings.tr_number),
        footer_message = COALESCE($11, print_settings.footer_message),
        print_type = COALESCE($12, print_settings.print_type),
        qr_image_url = COALESCE($13, print_settings.qr_image_url),
        qr_width = COALESCE($14, print_settings.qr_width),
        qr_height = COALESCE($15, print_settings.qr_height),
        show_qr_code = COALESCE($16, print_settings.show_qr_code),
        show_arabic_translations = COALESCE($17, print_settings.show_arabic_translations)
      RETURNING *
    `;
    const paramsWithoutShowQr = [
      tenantId, company_name, email, phone, address, store,
      header_image_url, image_height, image_width,
      tr_number, footer_message, print_type,
      qr_image_url, qr_width, qr_height,
      showArabicBool
    ];
    const sqlWithoutShowQr = `
      INSERT INTO print_settings (
        tenant_id, company_name, email, phone, address, store,
        header_image_url, image_height, image_width,
        tr_number, footer_message, print_type,
        qr_image_url, qr_width, qr_height,
        show_arabic_translations
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (tenant_id) DO UPDATE SET
        company_name = COALESCE($2, print_settings.company_name),
        email = COALESCE($3, print_settings.email),
        phone = COALESCE($4, print_settings.phone),
        address = COALESCE($5, print_settings.address),
        store = COALESCE($6, print_settings.store),
        header_image_url = COALESCE($7, print_settings.header_image_url),
        image_height = COALESCE($8, print_settings.image_height),
        image_width = COALESCE($9, print_settings.image_width),
        tr_number = COALESCE($10, print_settings.tr_number),
        footer_message = COALESCE($11, print_settings.footer_message),
        print_type = COALESCE($12, print_settings.print_type),
        qr_image_url = COALESCE($13, print_settings.qr_image_url),
        qr_width = COALESCE($14, print_settings.qr_width),
        qr_height = COALESCE($15, print_settings.qr_height),
        show_arabic_translations = COALESCE($16, print_settings.show_arabic_translations)
      RETURNING *
    `;

    try {
      const { rows } = await db.query(sqlWithShowQr, paramsWithShowQr);
      const row = rows[0];
      if (row && typeof row.show_qr_code === 'undefined') row.show_qr_code = showQrBool;
      return row;
    } catch (err) {
      if (err.code === '42703' && err.message && err.message.includes('show_qr_code')) {
        const { rows } = await db.query(sqlWithoutShowQr, paramsWithoutShowQr);
        const row = rows[0];
        if (row) row.show_qr_code = showQrBool;
        return row;
      }
      throw err;
    }
  }
}

module.exports = PrintSettingsRepository