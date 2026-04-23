const service = require("./customPages.service");

const createCustomPage = async (req, res) => {
  try {
    const page = await service.createCustomPage(req.body);
    res.status(201).json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllCustomPages = async (req, res) => {
  try {
    const pages = await service.getAllCustomPages();
    res.status(200).json({ success: true, data: pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomPageById = async (req, res) => {
  try {
    const page = await service.getCustomPageById(req.params.id);
    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomPageByPath = async (req, res) => {
  try {
    // encodeURIComponent might be needed if path has slashes, but usually passed via query param or generic body
    const path = req.query.path || req.params.path;
    const page = await service.getCustomPageByPath(path);
    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCustomPage = async (req, res) => {
  try {
    const page = await service.updateCustomPage(req.params.id, req.body);
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCustomPage = async (req, res) => {
  try {
    const page = await service.deleteCustomPage(req.params.id);
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCustomPage,
  getAllCustomPages,
  getCustomPageById,
  getCustomPageByPath,
  updateCustomPage,
  deleteCustomPage,
};
