require("dotenv").config();

const cors = require("cors");
const express = require("express");

const authRoutes = require("./api/auth/auth.routes");
const userRoutes = require("./api/user/user.routes");

const memberRoutes = require("./api/member/member.routes");
const memberAttendanceRoutes = require("./api/memberAttendance/memberAttendance.routes");
const subscriptionRoutes = require("./api/subscription/subscription.routes");
const membershipPlanRoutes = require("./api/membershipPlan/membershipPlan.routes");
const employeeRoutes = require("./api/employee/employee.routes");
const employeepositionRoutes = require("./api/employeeposition/employeeposition.routes");
const employeeAttendanceRoutes = require("./api/employeeAttendance/employeeAttendance.routes");
const employeePayrollRoutes = require("./api/employeePayroll/employeePayroll.routes");
const accountRoutes = require("./api/account/account.routes");
const cashbookRoutes = require("./api/cashbook/cashBook.routes");
const expenseRoutes = require("./api/expense/expense.routes");
const expenseTypeRoutes = require("./api/expenseType/expenseType.routes");
const summaryRoutes = require("./api/summary/summary.routes");
const dailySummaryRoutes = require("./api/dailySummary/dailysummary.routes");
const cost_centerRoutes = require('./api/costCenter/costCenter.routes')
const done_byRoutes = require('./api/doneBy/doneBy.routes')
const settingsRoutes = require('./api/settings/settings.routes')
const roleRoutes = require('./api/role/role.routes')
const tenantRoutes = require('./api/tenant/tenant.routes')
const transactionRoutes = require('./api/transaction/transaction.routes')
const DietPlanRoutes = require('./api/dietPlan/dietPlan.routes')
const DietPlanItemRoutes = require('./api/dietPlanItem/dietPlanItem.routes')
const classRoutes=require('./api/classes/class.routes')
const classScheduleRoutes=require('./api/classSchedule/classSchedule.routes')
const classBookingRoutes=require('./api/classBooking/classBooking.routes')

const ptPackageRoutes = require("./api/ptPackage/ptPackage.routes");
const ptBookingRoutes = require("./api/ptBooking/ptBooking.routes");
const ptSessionRoutes = require("./api/ptSession/ptSession.routes");
const exerciseRoutes = require("./api/exercise/exercise.routes");
const workoutPlanRoutes = require("./api/workoutPlan/workoutPlan.routes");
const workoutPlanItemRoutes = require("./api/workoutPlanItem/workoutPlanItem.routes");



const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/membership-plans", membershipPlanRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/employee-position", employeepositionRoutes);
app.use("/api/employee-attendance", employeeAttendanceRoutes);
app.use("/api/employee-payroll", employeePayrollRoutes);
app.use("/api/member-attendance", memberAttendanceRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/daily-summary", dailySummaryRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/cash-books", cashbookRoutes);
app.use("/api/expenses", expenseRoutes);
app.use('/api/expense-types', expenseTypeRoutes);
app.use('/api/cost-centers', cost_centerRoutes)
app.use('/api/done-by', done_byRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api/tenant', tenantRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/diet-plans', DietPlanRoutes);
app.use('/api/diet_plan_items', DietPlanItemRoutes);
app.use('/api/class',classRoutes)
app.use('/api/class-schedules',classScheduleRoutes)
app.use('/api/class-Booking',classBookingRoutes)

app.use("/api/pt-packages", ptPackageRoutes);
app.use("/api/pt-bookings", ptBookingRoutes);
app.use("/api/pt-sessions", ptSessionRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workout-plans", workoutPlanRoutes);
app.use("/api/workout-plan-items", workoutPlanItemRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({ message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
