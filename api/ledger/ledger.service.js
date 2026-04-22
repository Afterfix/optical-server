class LedgerService {
  constructor(ledgerRepository) {
    this.ledgerRepository = ledgerRepository;
  }

  async create(ledgerData, db) {
    try {
      const { party_id, ...data } = ledgerData;
      const newLedger = await this.ledgerRepository.create(db, data);
      if (!newLedger) {
        throw new Error("Failed to create ledger.");
      }

      if (party_id) {
        await this.ledgerRepository.linkToParty(
          db,
          newLedger.id,
          party_id,
          data.tenant_id,
        );
      }

      return {
        status: "success",
        data: newLedger,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(`A ledger named "${ledgerData.name}" already exists.`);
      }
      throw error;
    }
  }

  async update(id, tenantId, ledgerData, db) {
    try {
      const readOnlyFields = [
        "created_at",
        "updated_at",
        "total_count",
        "done_by_name",
        "cost_center_name",
      ];
      readOnlyFields.forEach((field) => delete ledgerData[field]);

      const updatedLedger = await this.ledgerRepository.update(
        db,
        id,
        tenantId,
        ledgerData,
      );

      if (!updatedLedger) return null;

      return {
        status: "success",
        data: updatedLedger,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(`The name "${ledgerData.name}" is already taken.`);
      }
      throw error;
    }
  }

  async delete(id, tenantId, db) {
    const result = await this.ledgerRepository.delete(db, id, tenantId);
    return {
      status: "success",
      data: result,
    };
  }

  // ... keep other methods (getById, adjustBalance, getAll, etc.) as is
  async getById(id, tenantId, db) {
    return await this.ledgerRepository.getById(db, id, tenantId);
  }

  async adjustBalance(client, ledgerId, tenantId, amount) {
    return await this.ledgerRepository.adjustBalance(
      client,
      ledgerId,
      tenantId,
      amount,
    );
  }

  async getAll(tenantId, filters, db) {
    return await this.ledgerRepository.getAllByTenantId(db, tenantId, filters);
  }

  async getPaginatedByTenantId(tenantId, filters, db) {
    const { items, totalCount } =
      await this.ledgerRepository.getPaginatedTenantId(db, tenantId, filters);
    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
    return {
      data: items,
      count: totalCount,
      page_count,
    };
  }

  async getReport(tenantId, filters, db) {
    return await this.ledgerRepository.getReport(db, tenantId, filters);
  }

  async getMonthlyReport(tenantId, filters, db) {
    return await this.ledgerRepository.getMonthlyReport(db, tenantId, filters);
  }
}

module.exports = LedgerService;
