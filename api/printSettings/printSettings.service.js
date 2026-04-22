const {
  movePrintHeaderImage,
  movePrintQrImage,
  deletePrintImageFile // <-- Import the new delete function
} = require('../../middlewares/upload');

class PrintSettingsService {
  constructor(repository) {
    this.repository = repository;
  }

  _normalizeImageUrl(url) {
    if (typeof url !== 'string') return url;
    if (url.startsWith('//')) url = url.replace(/^\/+/, '/');
    url = url.replace(/\s/g, '%20');
    if (url.includes('inventoryx')) url = url.replace(/inventoryx/g, 'inventoryx');
    if (url.includes('inventorys')) url = url.replace(/inventorys/g, 'inventoryx');
    return url;
  }

  /** Build a clean /uploads/... path that the frontend can use directly. */
  _proxyPath(tenantId, url) {
    if (!url || typeof url !== 'string') return null;
    // Normalize: strip any leading slashes first
    let clean = url.replace(/^\/+/, '');
    // Accepted format: uploads/{tenantId}/print/{filename}
    if (clean.startsWith(`uploads/${tenantId}/print/`) || clean.startsWith(`uploads/`)) {
      return `/${clean}`;
    }
    return null;
  }

  async getSettings(db, tenantId) {
    const settings = await this.repository.getByTenantId(db, tenantId);
    if (settings) {
      if (settings.header_image_url) settings.header_image_url = this._normalizeImageUrl(settings.header_image_url);
      if (settings.qr_image_url) settings.qr_image_url = this._normalizeImageUrl(settings.qr_image_url);
      if (settings.header_image_url) settings.header_image_proxy_path = this._proxyPath(tenantId, settings.header_image_url);
      if (settings.qr_image_url) settings.qr_image_proxy_path = this._proxyPath(tenantId, settings.qr_image_url);
      return settings;

    }
    // Return default settings if none exist
    return { tenant_id: tenantId /* ... your other defaults */ };
  }

  // FIX: This method now contains the full image handling logic, just like item.service.js
  async updateSettings(db, tenantId, settingsData) {
    // 1. Get the current settings to check for old image paths
    const currentSettings = await this.getSettings(db, tenantId);

    // 2. Separate files from text data
    const headerImageFile = settingsData.headerImageFile;
    const qrImageFile = settingsData.qrImageFile;
    delete settingsData.headerImageFile;
    delete settingsData.qrImageFile;

    try {
      // 3. Handle Header Image upload
      if (headerImageFile) {
        // Delete the old image if it exists
        if (currentSettings && currentSettings.header_image_url) {
          await deletePrintImageFile(currentSettings.header_image_url);
        }
        // Move the new image and get its path
        const newImagePath = await movePrintHeaderImage(headerImageFile, tenantId);
        settingsData.header_image_url = newImagePath;
      }

      // 4. Handle QR Image upload
      if (qrImageFile) {
        // Delete the old QR image if it exists
        if (currentSettings && currentSettings.qr_image_url) {
          await deletePrintImageFile(currentSettings.qr_image_url);
        }
        // Move the new QR image and get its path
        const newQrPath = await movePrintQrImage(qrImageFile, tenantId);
        settingsData.qr_image_url = newQrPath;
      }

      // 5. Merge and save all data to the database
      const fullSettings = await this.getSettings(db, tenantId);
      const mergedSettings = { ...fullSettings, ...settingsData };
      return this.repository.createOrUpdate(db, tenantId, mergedSettings);

    } catch (error) {
      // If anything goes wrong, attempt to clean up the newly uploaded temp files
      if (headerImageFile) await fsPromises.unlink(headerImageFile.path).catch(e => { });
      if (qrImageFile) await fsPromises.unlink(qrImageFile.path).catch(e => { });
      throw error; // Re-throw the error to be handled by the controller
    }
  }
}

module.exports = PrintSettingsService;