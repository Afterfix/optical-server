class PartnershipService {
  constructor(repository, transactionService) {
    this.repository = repository;
    this.transactionService = transactionService;
  }

  _calculateContributionStatus(contribution, paid) {
    const contributionNum = parseFloat(contribution) || 0;
    const paidNum = parseFloat(paid) || 0;

    if (contributionNum <= 0) return "pending";
    if (paidNum >= contributionNum) return "paid";
    if (paidNum > 0) return "partial";
    return "pending";
  }

  // ADDED: db param
  async getAll(tenantId, filters, db) {
    return this.repository.getAllByTenantId(db, tenantId, filters);
  }

  // ADDED: db param
  async getAllPaginated(tenantId, filters, db) {
    const {
      partnerships,
      totalCount,
      total_contribution,
      total_contribution_paid,
    } = await this.repository.getPaginatedByTenantId(db, tenantId, filters);

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    const totalContribution = parseFloat(total_contribution || 0);
    const totalContributionPaid = parseFloat(total_contribution_paid || 0);
    const pending_contribution = totalContribution - totalContributionPaid;

    return {
      data: partnerships,
      count: totalCount,
      page_count,
      total_contribution: totalContribution,
      total_contribution_paid: totalContributionPaid,
      pending_contribution: pending_contribution,
    };
  }

  // ADDED: db param
  async getById(id, tenantId, db) {
    const partnership = await this.repository.getById(db, id, tenantId);
    if (!partnership) {
      throw new Error("Partnership record not found or not authorized");
    }
    return partnership;
  }

  // ADDED: db param
  async create(tenantId, data, user, db) {
    // Get transaction client from db
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const contribution = parseFloat(data.contribution) || 0;
      let contributionPaid = parseFloat(data.contribution_payment_paid) || 0;

      const calculatedStatus = this._calculateContributionStatus(
        contribution,
        contributionPaid,
      );
      if (calculatedStatus === "paid") contributionPaid = contribution;

      const partnershipData = {
        ...data,
        tenant_id: tenantId,
        contribution_payment_paid: contributionPaid,
        contribution_payment_status: calculatedStatus,
      };

      // Pass client to repo
      const newPartnership = await this.repository.create(
        client,
        partnershipData,
      );

      if (
        newPartnership &&
        data.from_account &&
        newPartnership.contribution_payment_paid > 0
      ) {
        // FIX: Pass db (pool) and client (existingClient)
        await this.transactionService.create(
          {
            tenant_id: tenantId,
            transaction_type: "partnership",
            reference_id: newPartnership.id,
            account_id: data.from_account,
            amount: parseFloat(newPartnership.contribution_payment_paid),
            description: `Partnership contribution paid for partnership ID ${newPartnership.id}.`,
            done_by_id: data.done_by_id,
            cost_center_id: data.cost_center_id,
          },
          db, // Pass pool
          client, // Pass existing client
        );
      }

      await client.query("COMMIT");
      // Use db for the read now that the transaction is committed.
      // const data = this.repository.getById(db, newPartnership.id, tenantId);
      return {
        status: "success",
        data: newPartnership,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        message: error.message || "Something went wrong",
      };
    } finally {
      client.release();
    }
  }

  // ADDED: db param
  async update(id, tenantId, partnershipData, user, db) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // Use client for read within the transaction
      const originalPartnership = await this.repository.getById(
        client,
        id,
        tenantId,
      );
      if (!originalPartnership) throw new Error("Partnership not found");

      const contribution =
        partnershipData.contribution !== undefined
          ? parseFloat(partnershipData.contribution) || 0
          : parseFloat(originalPartnership.contribution) || 0;

      const paidValueSource =
        partnershipData.contribution_payment_paid !== undefined
          ? partnershipData.contribution_payment_paid
          : originalPartnership.contribution_payment_paid;

      let contributionPaid = parseFloat(paidValueSource) || 0;

      const calculatedStatus = this._calculateContributionStatus(
        contribution,
        contributionPaid,
      );
      if (calculatedStatus === "paid") contributionPaid = contribution;

      const cleanData = {
        partner_id: partnershipData.partner_id,
        contribution: partnershipData.contribution,
        profit_share: partnershipData.profit_share,
        from_account: partnershipData.from_account,
        contribution_payment_paid: contributionPaid,
        contribution_payment_status: calculatedStatus,
        profit_share_payment_status:
          partnershipData.profit_share_payment_status,
        done_by_id: partnershipData.done_by_id,
        cost_center_id: partnershipData.cost_center_id,
      };

      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === undefined) delete cleanData[key];
      });

      // 1. Update Partnership (Pass client)
      const updatedPartnership = await this.repository.update(
        client,
        id,
        tenantId,
        cleanData,
      );

      // 2. Update/Sync Transaction
      const accountId =
        updatedPartnership.from_account || originalPartnership.from_account;
      const finalPaidAmount = parseFloat(
        updatedPartnership.contribution_payment_paid,
      );

      if (accountId && finalPaidAmount > 0) {
        // FIX: Pass db (pool) and client (existingClient)
        await this.transactionService.updateByReference(
          {
            tenant_id: tenantId,
            transaction_type: "partnership",
            reference_id: updatedPartnership.id,
            account_id: accountId,
            amount: finalPaidAmount,
            description: `Updated partnership contribution paid for partnership ID ${updatedPartnership.id}.`,
            cost_center_id: updatedPartnership.cost_center_id,
          },
          db, // Pass pool
          client, // Pass existing client
        );
      } else {
        // If amount becomes 0 or account removed, delete transaction (Pass client)
        await this.transactionService.deleteByReference(
          tenantId,
          "partnership",
          id,
          client,
        );
      }

      await client.query("COMMIT");
      // Use db for the read now that the transaction is committed.
      // return this.repository.getById(db, id, tenantId);
      return {
        status: "success",
        data: updatedPartnership,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      // throw error;
      return {
        status: "failed",
        message: error.message || "Something went wrong",
      };
    } finally {
      client.release();
    }
  }

  // ADDED: db param
  async delete(id, tenantId, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Pass client
      await this.transactionService.deleteByReference(
        tenantId,
        "partnership",
        id,
        client,
      );

      // Pass client
      const deletedPartnership = await this.repository.delete(
        client,
        id,
        tenantId,
      );
      if (!deletedPartnership) {
        throw new Error("Partnership not found or not authorized to delete");
      }

      await client.query("COMMIT");
      return {
        status: "success",
        data: deletedPartnership,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PartnershipService;
