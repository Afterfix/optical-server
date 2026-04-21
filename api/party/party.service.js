class PartyService {
  constructor(partyRepository, ledgerService) {
    this.partyRepository = partyRepository;
    this.ledgerService = ledgerService;
  }

  /**
   * Get all parties for a tenant based on filters
   */
  async getAll(user, filters, db) {
    return await this.partyRepository.getByTenantId(
      db,
      user.tenant_id,
      filters,
    );
  }

  /**
   * Get paginated list of parties
   */
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
    try {
      // Start transaction using the passed db object directly
      await db.query("BEGIN");

      // 1. Prepare data for the Ledger
      const ledgerName = `${partyData.name} - ${partyData.type.toUpperCase()}`;
      const ledgerData = {
        tenant_id: user.tenant_id,
        name: ledgerName,
        balance: 0.0,
        done_by_id: partyData.done_by_id,
        cost_center_id: partyData.cost_center_id,
      };

      // 2. Create the Ledger
      const newLedgerResponse = await this.ledgerService.create(
        ledgerData,
        db,
      );

      // Robust check for Ledger ID (handles both wrapped and unwrapped responses)
      const ledgerId = newLedgerResponse?.data?.id || newLedgerResponse?.id;

      if (!ledgerId) {
        throw new Error(
          "Failed to create a linked ledger account for this party.",
        );
      }

      // 3. Prepare data for the Party
      const dataToSave = {
        ...partyData,
        tenant_id: user.tenant_id,
        ledger_id: ledgerId,
      };

      // 4. Save the Party
      const newParty = await this.partyRepository.create(db, dataToSave);

      await db.query("COMMIT");
      return { status: "success", data: newParty };
    } catch (error) {
      // Rollback on error
      await db.query("ROLLBACK");

      // Handle Unique Constraint (Postgres code 23505)
      if (error.code === "23505") {
        throw new Error(
          `A ${partyData.type} named "${partyData.name}" already exists for this tenant.`,
        );
      }
      throw error;
    }
  }

  /**
   * Get a specific party by ID
   */
  async getById(id, tenantId, db) {
    const party = await this.partyRepository.getById(db, id, tenantId);
    if (!party) {
      throw new Error("Party not found or user not authorized");
    }
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
      if (error.code === "23505") {
        throw new Error(
          `The name "${partyData.name}" is already taken for this type of party.`,
        );
      }
      throw error;
    }
  }

  /**
   * Delete a party
   */
  async delete(id, user, db) {
    const data = await this.partyRepository.delete(db, id, user.tenant_id);
    return {
      status: "success",
      data,
    };
  }
}

module.exports = PartyService;