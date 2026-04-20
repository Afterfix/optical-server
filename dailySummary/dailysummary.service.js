class DailySummaryService {
    constructor(dailySummaryRepository) {
        this.repository = dailySummaryRepository;
    }

    // ADDED: db param
    async generateSummary(db, tenantId, filters) { 
        const { page = 1, page_size = 10 } = filters;
        const limit = parseInt(page_size, 10);
        const offset = (parseInt(page, 10) - 1) * limit;

        const [
            dailyExpenses, 
            dailySales, 
            dailyPurchases,
            overallExpenses,
            overallSales,
            overallPurchases
        ] = await Promise.all([
            // Passed db to all repository methods
            this.repository.getExpenses(db, tenantId, filters),
            this.repository.getSales(db, tenantId, filters),
            this.repository.getPurchases(db, tenantId, filters),
            this.repository.getOverallExpenses(db, tenantId, filters),
            this.repository.getOverallSales(db, tenantId, filters),
            this.repository.getOverallPurchases(db, tenantId, filters),
        ]);

        const allDailySummaries = this._mergeSummaryData('summary_date', dailyExpenses, dailySales, dailyPurchases);

        const totalCount = allDailySummaries.length;
        const page_count = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;
        
        const paginatedData = allDailySummaries.slice(offset, offset + limit);

        const totalSalesAmount = parseFloat(overallSales.total_amount);
        const totalSalesReceived = parseFloat(overallSales.total_received);
        
        const totalPurchaseAmount = parseFloat(overallPurchases.total_amount);
        const totalPurchasePaid = parseFloat(overallPurchases.total_paid);
        
        const totalExpenseAmount = parseFloat(overallExpenses.total_amount);
        const totalExpensePaid = parseFloat(overallExpenses.total_paid);

        const netProfit = totalSalesReceived - (totalPurchasePaid + totalExpensePaid);

        return {
            data: paginatedData,
            count: totalCount,
            page_count,
            totals: {
                sales: {
                    total_amount: totalSalesAmount,
                    received: totalSalesReceived,
                    pending: parseFloat(overallSales.total_pending)
                },
                purchase: {
                    total_amount: totalPurchaseAmount,
                    paid: totalPurchasePaid,
                    pending: parseFloat(overallPurchases.total_pending)
                },
                expenses: {
                    total_amount: totalExpenseAmount,
                    paid: totalExpensePaid,
                    balance: parseFloat(overallExpenses.total_balance),
                },
                netProfit,
            },
        };
    }

    _mergeSummaryData(dateKey, expenseData, newSales, purchaseData) {
        const merged = {};

        const defaultSummary = () => ({
            expense: { count: 0, amount: 0, paid: 0, balance: 0 },
            sale: { count: 0, amount: 0, received: 0, pending: 0 },
            purchase: { count: 0, amount: 0, paid: 0, pending: 0 },
        });

        const processItems = (items, type) => {
            for (const item of items) {
                const key = item[dateKey]; 

                if (!merged[key]) merged[key] = { date: key, ...defaultSummary() };

                if (type === 'expense') {
                    merged[key].expense = {
                      count: parseInt(item.expense_count, 10),
                      amount: parseFloat(item.total_amount),
                      paid: parseFloat(item.total_paid),
                      balance: parseFloat(item.total_balance),
                    };
                } else if (type === 'sale') {
                    merged[key].sale = {
                        count: parseInt(item.sale_count, 10),
                        amount: parseFloat(item.total_amount),
                        received: parseFloat(item.total_received),
                        pending: parseFloat(item.total_pending),
                    };
                } else if (type === 'purchase') {
                    merged[key].purchase = {
                        count: parseInt(item.purchase_count, 10),
                        amount: parseFloat(item.total_amount),
                        paid: parseFloat(item.total_paid),
                        pending: parseFloat(item.total_pending),
                    };
                }
            }
        };

        processItems(expenseData, 'expense');
        processItems(newSales, 'sale');
        processItems(purchaseData, 'purchase');
        
        return Object.values(merged).sort((a, b) => b.date.localeCompare(a.date));
    }
}

module.exports = DailySummaryService;