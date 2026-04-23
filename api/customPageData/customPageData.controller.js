const service = require("./customPageData.service");

const addRow = async (req, res) => {
  try {
    const { customPageId } = req.params;
    const row = await service.addRow(customPageId, req.body);
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRowsByPageId = async (req, res) => {
  try {
    const { customPageId } = req.params;
    const rows = await service.getRowsByPageId(customPageId);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateRow = async (req, res) => {
  try {
    const { customPageId, id } = req.params;
    const row = await service.updateRow(id, customPageId, req.body);
    if (!row) {
      return res.status(404).json({ success: false, message: "Row not found" });
    }
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteRow = async (req, res) => {
  try {
    const { customPageId, id } = req.params;
    const row = await service.deleteRow(id, customPageId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Row not found" });
    }
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addRow,
  getRowsByPageId,
  updateRow,
  deleteRow,
};
