const { movePrintHeaderImage, movePrintQrImage, deletePrintImageFile } = require('../../middlewares/upload');

class PrintSettingsController {
  constructor(service) {
    this.service = service
  }

  async get(req, res, next) {
    try {
      const settings = await this.service.getSettings(req.db, req.user.tenant_id)
      res.json(settings)
    } catch (error) {
      next(error)
    }
  }

  async update(req, res, next) {
    try {
      // ADDED: Fetch current settings to get old image paths before updating.
      const oldSettings = await this.service.getSettings(req.db, req.user.tenant_id);
      
      const settingsData = { ...req.body };
      if (typeof settingsData.show_qr_code === 'string') {
        settingsData.show_qr_code = settingsData.show_qr_code === 'true';
      }

      if (req.files) {
        // Handle Header Image
        if (req.files.header_image && req.files.header_image[0]) {
          // ADDED: Delete the old header image if it exists.
          if (oldSettings && oldSettings.header_image_url) {
            await deletePrintImageFile(oldSettings.header_image_url);
          }
          
          const imagePath = await movePrintHeaderImage(req.files.header_image[0], req.user.tenant_id);
          if (imagePath) {
            // Path is already /uploads/... or http://...
            settingsData.header_image_url = imagePath.startsWith("http") ? imagePath : (imagePath.startsWith('/') ? imagePath : `/${imagePath}`);
          }
        }

        // Handle QR Code Image
        if (req.files.qr_image && req.files.qr_image[0]) {
          // ADDED: Delete the old QR image if it exists.
          if (oldSettings && oldSettings.qr_image_url) {
            await deletePrintImageFile(oldSettings.qr_image_url);
          }
          
          const qrPath = await movePrintQrImage(req.files.qr_image[0], req.user.tenant_id);
          if (qrPath) {
            settingsData.qr_image_url = qrPath.startsWith("http") ? qrPath : (qrPath.startsWith('/') ? qrPath : `/${qrPath}`);
          }
        }
      }

      const updatedSettings = await this.service.updateSettings(
        req.db,
        req.user.tenant_id,
        settingsData
      );
      res.json(updatedSettings);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PrintSettingsController;