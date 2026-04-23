const repository = require("./customPages.repository");

const createCustomPage = async (pageData) => {
  return await repository.createCustomPage(pageData);
};

const getAllCustomPages = async (userId, role) => {
  return await repository.getAllCustomPages(userId, role);
};

const getCustomPageById = async (id) => {
  return await repository.getCustomPageById(id);
};

const getCustomPageByPath = async (path, userId, role) => {
  return await repository.getCustomPageByPath(path, userId, role);
};

const updateCustomPage = async (id, pageData) => {
  return await repository.updateCustomPage(id, pageData);
};

const deleteCustomPage = async (id) => {
  return await repository.deleteCustomPage(id);
};

module.exports = {
  createCustomPage,
  getAllCustomPages,
  getCustomPageById,
  getCustomPageByPath,
  updateCustomPage,
  deleteCustomPage,
};
