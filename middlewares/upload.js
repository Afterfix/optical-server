const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('../config/cloudinary');

const tempUploadPath = path.join(__dirname, '..', 'uploads', 'temp');

require('fs').mkdirSync(tempUploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadPath); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const upload = multer({ storage });

// Helper to delete local temp file
const cleanupTempFile = async (filePath) => {
  try {
    if (filePath) await fs.unlink(filePath);
  } catch (err) {
    console.error("Failed to clean up temp file:", filePath, err);
  }
};

// Helper to extract Cloudinary public_id and delete
const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) return;
  try {
    const parts = imageUrl.split('/');
    const filename = parts.pop().split('.')[0];
    const folderPath = parts.slice(parts.indexOf('upload') + 2).join('/');
    const public_id = `${folderPath}/${filename}`;
    await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};

const moveItemImage = async (file, userId, itemId) => {
  if (!file || !userId || !itemId) return null;
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `optical/items/${userId}/${itemId}`
    });
    await cleanupTempFile(file.path);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading item image to Cloudinary:", error);
    await cleanupTempFile(file.path);
    return null;
  }
};

const deleteItemImageDirectory = async (userId, itemId) => {
  try {
    await cloudinary.api.delete_resources_by_prefix(`optical/items/${userId}/${itemId}`);
  } catch (err) {
    console.error(`Failed to delete cloudinary directory for item ${itemId}:`, err);
  }
};

const movePrintHeaderImage = async (file, tenantId) => {
  if (!file || !tenantId) return null;
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `optical/print/${tenantId}`
    });
    await cleanupTempFile(file.path);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading print header image:", error);
    await cleanupTempFile(file.path);
    return null;
  }
};

const movePrintQrImage = async (file, tenantId) => {
  if (!file || !tenantId) return null;
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `optical/print/${tenantId}`
    });
    await cleanupTempFile(file.path);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading print QR image:", error);
    await cleanupTempFile(file.path);
    return null;
  }
};

const deletePrintImageFile = async (relativeFilePath) => {
  if (!relativeFilePath) return;
  if (relativeFilePath.includes('res.cloudinary.com')) {
    await deleteFromCloudinary(relativeFilePath);
  } else {
    // legacy local file
    try {
      const cleanPath = relativeFilePath.startsWith("/") ? relativeFilePath.substring(1) : relativeFilePath;
      const fullPath = path.join(__dirname, "..", cleanPath);
      await fs.unlink(fullPath);
    } catch (err) {
      if (err.code !== "ENOENT") console.error(`Failed to delete local file ${relativeFilePath}:`, err);
    }
  }
};

const moveFrameVariantImage = async (file, tenantId) => {
  if (!file || !tenantId) return null;
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `optical/frame-variants/${tenantId}`
    });
    await cleanupTempFile(file.path);
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading frame variant image:', error);
    await cleanupTempFile(file.path);
    return null;
  }
};

const deleteFrameVariantImageFile = async (relativeFilePath) => {
  if (!relativeFilePath) return;
  if (relativeFilePath.includes('res.cloudinary.com')) {
    await deleteFromCloudinary(relativeFilePath);
  } else {
    // legacy local file
    try {
      const cleanPath = relativeFilePath.startsWith('/') ? relativeFilePath.substring(1) : relativeFilePath;
      const fullPath = path.join(__dirname, '..', cleanPath);
      await fs.unlink(fullPath);
    } catch (err) {
      if (err.code !== 'ENOENT') console.error(`Failed to delete local file ${relativeFilePath}:`, err);
    }
  }
};

module.exports = {
  upload,
  moveItemImage,
  deleteItemImageDirectory,
  movePrintHeaderImage,
  movePrintQrImage,
  deletePrintImageFile,
  moveFrameVariantImage,
  deleteFrameVariantImageFile,
};