const { pool } = require("../../config/db");

// Import all table creation modules
const createTenantTable = require("../../api/tenant/tenant.table.js");
const createRoleTable = require("../../api/role/role.table.js");
const createUsersTable = require("../../api/user/user.table.js");
const createUserTokenTable = require("../../api/token/token.table.js");
const createSettingsTable = require("../../api/settings/settings.table.js");

const createBrandTable = require("../../api/brand/brand.table.js");
const createCategoryTable = require("../../api/category/category.table.js");
const createEmployeeTable = require("../../api/employee/employee.table.js");
const createEmployeePositionTable = require("../../api/employeePosition/employeePosition.table.js");
const createExpenseTypeTable = require("../../api/expenseType/expenseType.table.js");
const createExpenseTable = require("../../api/expense/expense.table.js");
const createInvoiceNumberTable = require("../../api/invoiceNumber/invoiceNumber.table.js");
const createModeOfPaymentTable = require("../../api/modeOfPayment/modeOfPayment.table.js");
const createPayrollTable = require("../../api/payroll/payroll.table.js");
const createPurchaseTable = require("../../api/purchase/purchase.table.js");
const createPurchaseItemTable = require("../../api/purchaseItem/purchaseItem.table.js");
const createPurchaseReturnTable = require("../../api/purchaseReturn/purchaseReturn.table.js");
const createSaleItemTable = require("../../api/saleItem/saleItem.table.js");
const createSaleReturnTable = require("../../api/saleReturn/saleReturn.table.js");
const createSalesTable = require("../../api/sales/sales.table.js");
const createDoneByTable = require("../../api/doneBy/doneBy.table.js");
const createCostCenterTable = require("../../api/costCenter/costcenter.table.js");
const createPrescriptionTable = require("../../api/Prescriptions/prescription.table.js");
const createServicesTable = require("../../api/services/services.table.js");
const createAccountTable = require("../../api/account/account.table.js");
const createPartnerTable = require("../../api/partner/partner.table.js");
const createPartyTable = require("../../api/party/party.table.js");
const createLedgerTable = require("../../api/ledger/ledger.table.js");
const createVoucherTable = require("../../api/voucher/voucher.table.js");
const createReportFieldPermissionsTable = require("../../api/reportFieldPermissions/reportFieldPermissions.table.js");
const createTrasactionLedgerTable = require("../../api/transactionLedger/transactionLedger.table.js");
const createTransactionFieldPermissionsTable = require("../../api/transactionFieldPermissions/transactionFieldPermissions.table.js");
const createTransactionTable = require("../../api/transaction/transaction.table.js");
const createQueryTable = require("./tables/query.table.js");
const createPrintSettingsTable = require("../../api/printSettings/printSettings.table.js");
const createVoucherTransactionTable = require("../../api/voucherTransaction/voucherTransaction.table.js");
const createCustomPagesTable = require("../../api/customPages/customPages.table.js");
const createCustomPageDataTable = require("../../api/customPageData/customPageData.table.js");

const createCategoryCustomFieldsTable = require("../../api/categoryCustomFields/categoryCustomFields.table.js");
const createItemTable = require("../../api/item/item.table.js");
const createItemCustomFieldsTable = require("../../api/itemCustomFieldValues/itemCustomFieldValues.table.js");
const createTables = async () => {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting database migration...");

    await createQueryTable(client);

    await createTenantTable(client);
    await createRoleTable(client);
    await createUsersTable(client);
    await createUserTokenTable(client);
    await createSettingsTable(client);
    await createDoneByTable(client);
    await createCostCenterTable(client);
    await createBrandTable(client);
    await createCategoryTable(client);
    await createCategoryCustomFieldsTable(client);

    await createItemCustomFieldsTable(client);
    await createLedgerTable(client);
    await createPartyTable(client);
    await createServicesTable(client);
    await createInvoiceNumberTable(client);
    await createTransactionTable(client);
    await createPartnerTable(client);
    await createAccountTable(client);
    await createTrasactionLedgerTable(client);
    await createEmployeePositionTable(client);
    await createEmployeeTable(client);
    await createModeOfPaymentTable(client);
    await createExpenseTypeTable(client);

    await createVoucherTable(client);
    await createVoucherTransactionTable(client);
    await createPayrollTable(client);
    await createInvoiceNumberTable(client);
    await createReportFieldPermissionsTable(client);
    await createTransactionFieldPermissionsTable(client);
    await createExpenseTable(client);
    await createPurchaseTable(client);
    await createItemTable(client);
    await createPurchaseItemTable(client);
    // await createPurchaseReturnTable(client);
    await createSalesTable(client);
    await createPrescriptionTable(client);
    await createSaleItemTable(client);
    await createPrintSettingsTable(client);
    // await createSaleReturnTable(client);

    // await createQueryTable(client);
    await createCustomPagesTable(client);
    await createCustomPageDataTable(client);
    // await createSaleReturnTable(client);

    console.log("✅ All tables created successfully in the correct order.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    console.log("ℹ️ Database client released.");
  }
};

module.exports = createTables;
