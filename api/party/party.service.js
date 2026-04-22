class PartyService {
  constructor(partyRepository, ledgerService) {
    this.partyRepository = partyRepository;
    this.ledgerService = ledgerService;
  }

  async getAll(user, filters, db) {
    // If we are on the customer page, we should only see parties of type 'customer'
    const queryFilters = { ...filters };
    return await this.partyRepository.getByTenantId(
      db,
      user.tenant_id,
      queryFilters,
    );
  }

  async getPaginatedByTenantId(user, filters, db) {
    const { parties, totalCount } =
      await this.partyRepository.getPaginatedByTenantId(
        db,
        user.tenant_id,
        filters,
      );

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return {
      data: parties,
      count: totalCount,
      page_count,
    };
  }

  async create(partyData, user, db) {
    let ledgerId = null;

    try {
      // 1. Try to create the Ledger first
      if (this.ledgerService) {
        const ledgerName = `${partyData.name} - ${partyData.type.toUpperCase()}`;
        const ledgerData = {
          tenant_id: user.tenant_id,
          name: ledgerName,
          balance: 0.0,
          done_by_id: partyData.done_by_id,
          cost_center_id: partyData.cost_center_id,
        };

        const newLedgerResponse = await this.ledgerService.create(
          ledgerData,
          db,
        );
        ledgerId = newLedgerResponse?.data?.id || newLedgerResponse?.id;
      }

      // 2. Prepare data for the Party
      const dataToSave = {
        ...partyData,
        tenant_id: user.tenant_id,
        ledger_id: ledgerId,
      };

      // 3. Save the Party
      const newParty = await this.partyRepository.create(db, dataToSave);

      return { status: "success", data: newParty };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(
          `A ${partyData.type} named "${partyData.name}" already exists.`,
        );
      }
      throw error;
    }
  }

  async getById(id, tenantId, db) {
    const party = await this.partyRepository.getById(db, id, tenantId);
    if (!party) throw new Error("Party not found");
    return party;
  }

  async update(id, user, partyData, db) {
    try {
      const updatedParty = await this.partyRepository.update(
        db,
        id,
        user.tenant_id,
        partyData,
      );
      if (!updatedParty) return null;
      return { status: "success", data: updatedParty };
    } catch (error) {
      if (error.code === "23505") throw new Error("Name already taken.");
      throw error;
    }
  }

  async delete(id, user, db) {
    const data = await this.partyRepository.delete(db, id, user.tenant_id);
    return { status: "success", data };
  }
}

module.exports = PartyService;
