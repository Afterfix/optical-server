const { pool } = require("../../config/db");

// Import all table creation modules
const createTenantTable = require("../../api/tenant/tenant.table.js");
const createRoleTable = require("../../api/role/role.table.js");
const createUsersTable = require("../../api/user/user.table.js");
const createUserTokenTable = require("../../api/token/token.table.js");
const createSettingsTable = require("../../api/settings/settings.table.js");

const createBrandTable = require("../../api/brand/brand.table.js");
const createCategoryTable = require("../../api/category/category.table.js");
const createCustomerTable = require("../../api/customer/customer.table.js");
const createEmployeeTable = require("../../api/employee/employee.table.js");
const createEmployeePositionTable = require("../../api/employeePosition/employeePosition.table.js");
const createExpenseTypeTable = require("../../api/expenseType/expenseType.table.js");
const createExpenseTable = require("../../api/expense/expense.table.js");
const createInvoiceNumberTable = require("../../api/invoiceNumber/invoiceNumber.table.js");
const createItemTable = require("../../api/item/item.table.js");
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
const createFrameTable = require("../../api/frame/frame.table.js");
const createFrameVariantTable = require("../../api/frameVarient/frameVariant.table.js");
const createLensesTable = require("../../api/lenses/lenses.table.js");
const createLensAddonsTable = require("../../api/lensesAddons/lensAddons.table.js");
const createPrescriptionTable = require("../../api/Prescriptions/prescription.table.js");
const createServicesTable = require("../../api/services/services.table.js");
const createAccountTable = require("../../api/account/account.table.js");
const createPartnerTable = require("../../api/partner/partner.table.js");
const createPartyTable = require("../../api/party/party.table.js");
const createLedgerTable = require("../../api/ledger/ledger.table.js");
const createVoucherTable = require("../../api/voucher/voucher.table.js");

const createTables = async () => {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting database migration...");

    // Core tables
    await createTenantTable(client);
    await createRoleTable(client);
    await createUsersTable(client);
    await createUserTokenTable(client);
    await createSettingsTable(client);
    await createDoneByTable(client);
    await createCostCenterTable(client);
    await createBrandTable(client);
    await createCategoryTable(client);
    await createFrameTable(client);
    await createFrameVariantTable(client);
    await createLensesTable(client);
    await createLensAddonsTable(client);

    await createCustomerTable(client);
    await createPrescriptionTable(client);
    await createServicesTable(client);

    // // Setup tables
    await createEmployeePositionTable(client);
    await createEmployeeTable(client);
    await createPartnerTable(client);
    await createLedgerTable(client);
    await createPartyTable(client);
    await createAccountTable(client);
    await createModeOfPaymentTable(client);
    await createVoucherTable(client);
    await createPayrollTable(client);

    // // Business entities
    await createCustomerTable(client);
    // await createInvoiceNumberTable(client);

    // // Expense
    await createExpenseTypeTable(client);
    await createExpenseTable(client);

    // // Inventory
    // await createItemTable(client);

    // // Transactions
    // await createPurchaseTable(client);
    // await createPurchaseItemTable(client);
    // await createPurchaseReturnTable(client);

    // await createSalesTable(client);
    // await createSaleItemTable(client);
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
