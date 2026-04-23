const repository = require("./customPageData.repository");

const addRow = async (customPageId, rowData) => {
  return await repository.addRow(customPageId, rowData);
};

const getRowsByPageId = async (customPageId) => {
  return await repository.getRowsByPageId(customPageId);
};

const updateRow = async (id, customPageId, rowData) => {
  return await repository.updateRow(id, customPageId, rowData);
};

const deleteRow = async (id, customPageId) => {
  return await repository.deleteRow(id, customPageId);
};

module.exports = {
  addRow,
  getRowsByPageId,
  updateRow,
  deleteRow,
};
