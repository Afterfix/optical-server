const multer = require('multer');
const path = require('path');
const fs = require('fs').promises

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

const moveItemImage = async (file, userId, itemId) => {
  if (!file || !userId || !itemId) return null;

  const finalDirectory = path.join(__dirname, '..', 'uploads', String(userId), String(itemId));
  await fs.mkdir(finalDirectory, { recursive: true });

  const newPath = path.join(finalDirectory, file.filename);
  const oldPath = file.path; 

  try {
    await fs.rename(oldPath, newPath);
    return path.join(String(userId), String(itemId), file.filename).replace(/\\/g, "/");
  } catch (error) {
    console.error("Error moving file:", error);
    try { await fs.unlink(oldPath); } catch (e) {}
    return null;
  }
};

const deleteItemImageDirectory = async (userId, itemId) => {
  if (!userId || !itemId) return;
  try {
    const itemDirectory = path.join(__dirname, '..', 'uploads', String(userId), String(itemId));
    await fs.rm(itemDirectory, { recursive: true, force: true });
  } catch (err) {
    // It's okay if the directory doesn't exist, so we don't need to throw an error
    if (err.code !== 'ENOENT') {
      console.error(`Failed to delete directory for item ${itemId}:`, err);
    }
  }
};

module.exports = {
  upload,
  moveItemImage,
  deleteItemImageDirectory,
};