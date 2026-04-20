const { pool } = require("../../config/db");

// Import all table creation modules
const createTenantTable = require("../../api/tenant/tenant.table.js");
const createRoleTable = require("../../api/role/role.table.js");
const createUsersTable = require("../../api/user/user.table.js");
const createUserTokenTable = require("../../api/token/token.table.js");

const createCostCenterTable = require("../../api/costCenter/costcenter.table.js");
const createDoneByTable = require("../../api/doneBy/doneBy.table.js");
const createAccountTable = require("../../api/account/account.table.js");
const createExpenseTable = require("../../api/expense/expense.table.js");
const createExpenseTypeTable = require("../../api/expenseType/expenseType.table.js");

const createCashBookTable = require("../../api/cashbook/cashBook.table");
const createEmployeeTable = require("../../api/employee/employee.table.js");
const createEmployeePositionTable = require("../../api/employeePosition/employeePosition.table.js");
const createEmployeePayrollTable = require("../../api/employeePayroll/employeePayroll.table.js");
const createEmployeeAttendanceTable = require("../../api/employeeAttendance/employeeAttendance.table.js");
const createMemberTable = require("../../api/member/member.table");
const createMembershipPlanTable = require("../../api/membershipPlan/membershipPlan.table");
const createSubscriptionTable = require("../../api/subscription/subscription.table");
const createMemberAttendanceTable = require("../../api/memberAttendance/memberAttendance.table");
const createSettingsTable = require("../../api/settings/settings.table");

const createPtPackageTable = require("../../api/ptPackage/ptPackage.table.js");
const createPtBookingTable = require("../../api/ptBooking/ptBooking.table.js");
const createPtSessionTable = require("../../api/ptSession/ptSession.table.js");
const createExerciseTable = require("../../api/exercise/exercise.table.js");
const createWorkoutPlanTable = require("../../api/workoutPlan/workoutPlan.table.js");
const createWorkoutPlanItemTable = require("../../api/workoutPlanItem/workoutPlanItem.table.js");

const createTransactionTable = require("../../api/transaction/transaction.table.js");
const createTransactionLedgerTable = require("../../api/transactionLedger/transactionLedger.table.js");
const createClassTable = require("../../api/classes/class.table.js");
const createClassScheduleTable = require("../../api/classSchedule/classSchedule.table.js");
const createclassBookingTable = require("../../api/classBooking/classBooking.table.js");

const createDietPlanTable = require("../../api/dietPlan/dietPlan.table.js");
const createDietPlanItemTable = require("../../api/dietPlanItem/dietPlanItem.table.js");

const createQueryTable = require("./tables/query.table");

const createTables = async () => {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting database migration...");

    // --- LEVEL 0: Core tables with NO dependencies ---

    // --- LEVEL 1: Tables that depend ONLY on "user" ---
    // // Depends on user
    // await createTenantTable(client); // No dependencies

    // await createRoleTable(client);
    // await createUsersTable(client); // No dependencies
    // await createUserTokenTable(client);
    // await createCostCenterTable(client); // Depends on user
    // await createDoneByTable(client); // Depends on user
    // await createAccountTable(client); // Depends on user, partner

    // // await createCashBookTable(client); // Depends on user, account
    // await createExpenseTypeTable(client); // Depends on user
    // await createExpenseTable(client); // Depends on user, account

    // await createEmployeePositionTable(client); // Depends on user
    // await createMemberTable(client); // Depends on user
    // await createMembershipPlanTable(client); // Depends on user
    // await createMemberAttendanceTable(client); // Depends on member

    // // // --- LEVEL 2: Tables that depend on Level 1 tables ---
    // await createSubscriptionTable(client); // Depends on user, member, membership_plan
    // await createEmployeeTable(client); // Depends on user, employee_position

    // // // --- LEVEL 3: Tables that depend on Level 2 tables ---
    // await createEmployeeAttendanceTable(client); // Depends on employee
    // await createEmployeePayrollTable(client); // Depends on employee
    // // await createSettingsTable(client); // Depends on employee

    await createPtPackageTable(client);
    await createPtBookingTable(client);
    await createPtSessionTable(client);
    await createExerciseTable(client);
    await createWorkoutPlanTable(client);
    await createWorkoutPlanItemTable(client);

    await createTransactionTable(client);
    await createTransactionLedgerTable(client);
    // await createTransactionTable(client);
    // await createTransactionLedgerTable(client);

    await createClassTable(client);
    await createClassScheduleTable(client);
    await createclassBookingTable(client);

    await createDietPlanTable(client);
    await createDietPlanItemTable(client);

    // Note: The 'query.table.js' is for altering existing tables (migrations),
    // not for initial creation. It should be handled separately.
    // await createQueryTable(client);

    console.log("✅ All tables created successfully in the correct order.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1); // Exit with error code
  } finally {
    // client.release();
    // console.log("ℹ️ Database client released.");
  }
};

module.exports = createTables;
