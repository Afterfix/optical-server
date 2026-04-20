class MonthlySummaryService {
    constructor(monthlySummaryRepository) {
        this.repository = monthlySummaryRepository;
    }

    async generateSummary(tenantId, filters) { 
        const { page = 1, page_size = 10 } = filters;
        const limit = parseInt(page_size, 10);
        const offset = (parseInt(page, 10) - 1) * limit;

        const [monthlyExpenses, monthlySales, monthlyPurchases] = await Promise.all([
            // CHANGED: Pass tenantId to all repository methods
            this.repository.getExpenses(tenantId, filters),
            this.repository.getSales(tenantId, filters),
            this.repository.getPurchases(tenantId, filters),
        ]);

        const allMonthlySummaries = this._mergeSummaryData(monthlyExpenses, monthlySales, monthlyPurchases);

        const totalCount = allMonthlySummaries.length;
        const page_count = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;
        
        const paginatedData = allMonthlySummaries.slice(offset, offset + limit);

        return {
            data: paginatedData,
            count: totalCount,
            page_count,
        };
    }
    
    _mergeSummaryData(expenseData, saleData, purchaseData) {
        const merged = {};

        const defaultSummary = () => ({
            expense: { count: 0, amount: 0, paid: 0, balance: 0 },
            sale: { count: 0, received: 0, pending: 0 },
            purchase: { count: 0, paid: 0, pending: 0 },
        });

        const processItems = (items, type) => {
            for (const item of items) {
                const key = `${item.year}-${item.month}`;

                if (!merged[key]) {
                    merged[key] = {
                        year: parseFloat(item.year),
                        month: item.month,
                        ...defaultSummary()
                    };
                }

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
                        received: parseFloat(item.total_received),
                        pending: parseFloat(item.total_pending),
                    };
                } else if (type === 'purchase') {
                    merged[key].purchase = {
                        count: parseInt(item.purchase_count, 10),
                        paid: parseFloat(item.total_paid),
                        pending: parseFloat(item.total_pending),
                    };
                }
            }
        };

        processItems(expenseData, 'expense');
        processItems(saleData, 'sale');
        processItems(purchaseData, 'purchase');
        
        return Object.values(merged);
    }
}

module.exports = MonthlySummaryService;