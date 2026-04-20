const PartySummaryRepository = require("./partySummary.repository");

class PartySummaryService {
  constructor(repository = new PartySummaryRepository()) {
    this.repository = repository;
  }

  async generateSummary(db, tenant_id, filters) {
    const { start_date, end_date } = filters;

    const startDate = start_date || "1900-01-01";
    const endDateExclusive = end_date ? `${end_date} 23:59:59.999` : null;

    const parties = await this.repository.getAllParties(db, tenant_id);

    if (parties.length === 0) {
      return [];
    }

    const summaries = [];

    for (const party of parties) {
      const { id: partyId, name: partyName, type: partyType } = party;
      const sign = partyType === "customer" ? 1 : -1;

      // Period values
      const sales = await this.repository.getSalesInPeriod(
        db,
        tenant_id,
        partyId,
        startDate,
        endDateExclusive
      );
      const purchases = await this.repository.getPurchasesInPeriod(
        db,
        tenant_id,
        partyId,
        startDate,
        endDateExclusive
      );
      const payments = await this.repository.getPaymentsCreditedInPeriod(
        db,
        tenant_id,
        partyId,
        startDate,
        endDateExclusive
      );

      // Opening balance (before start_date)
      const openingSales = await this.repository.getCumulativeSalesBefore(
        db,
        tenant_id,
        partyId,
        startDate
      );
      const openingPurchases =
        await this.repository.getCumulativePurchasesBefore(
          db,
          tenant_id,
          partyId,
          startDate
        );
      const openingPayments =
        await this.repository.getCumulativePaymentsCreditedBefore(
          db,
          tenant_id,
          partyId,
          startDate
        );

      const internalOpeningBalance =
        (openingSales - openingPayments) * sign +
        (openingPayments - openingPurchases) * -sign;

      const opening_balance = parseFloat((-internalOpeningBalance).toFixed(2));

      // Closing balance
      const periodNet = payments * (partyType === "customer" ? -1 : 1);
      const closing_balance = opening_balance + periodNet;
      // const closing_balance = parseFloat((-internalClosingBalance).toFixed(2));

      summaries.push({
        party_id: partyId,
        party_name: partyName,
        party_type: partyType,
        sales: parseFloat(sales.toFixed(2)),
        purchases: parseFloat(purchases.toFixed(2)),
        payments: parseFloat(payments.toFixed(2)),
        opening_balance,
        closing_balance,
      });
    }

    return summaries;
  }

  async getPartyPaymentDetails(db, tenant_id, party_id, filters = {}) {
    const { start_date, end_date, transaction_type } = filters;  

    const startDate = start_date || "1900-01-01";
    const endDateExclusive = end_date ? `${end_date} 23:59:59.999` : null;

    // Verify the party exists and belongs to the tenant
    const party = await this.repository.getAllParties(db, tenant_id);
    const partyExists = party.some((p) => p.id === party_id);
    if (!partyExists) {
      throw new Error("Party not found or does not belong to this tenant");
    }

    const payments = await this.repository.getPartyPaymentsDetails(
      db,
      tenant_id,
      party_id,
      startDate,
      endDateExclusive,
      transaction_type  
    );

    // Optional: also return the total credited in period (for consistency with summary)
    const totalCredited = payments.reduce((sum, p) => sum + (p.credit || 0), 0);

    return {
      party_id,
      total_payments_in_period: parseFloat(totalCredited.toFixed(2)),
      payments: payments,
    };
  }
}

module.exports = PartySummaryService;