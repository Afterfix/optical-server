// src/hooks/api/ledger/ledger.controller.js
class LedgerController {
  constructor(ledgerService) {
    this.service = ledgerService;
  }

  async create(req, res, next) {
    try {
      const ledgerData = {
        ...req.body,
        tenant_id: req.user.tenant_id,
      };
      const newLedger = await this.service.create(ledgerData, req.db);
      res.status(201).json(newLedger);
    } catch (error) {
      if (error.statusCode === 409) {
        return res.status(409).json({ error: error.message });
      }
       if (error.message.includes('already exists')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updateData = { ...req.body };
      const updatedLedger = await this.service.update(
        req.params.id,
        req.user.tenant_id,
        updateData,
        req.db
      );
      if (!updatedLedger) {
        return res
          .status(404)
          .json({ message: "Ledger not found or not authorized to update" });
      }
      res.json(updatedLedger);
    } catch (error) {
      if (error.statusCode === 409) {
        return res.status(409).json({ error: error.message });
      }
       if (error.message.includes('already exists')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await this.service.delete(req.params.id, req.user.tenant_id, req.db); 
      if (!result) {
        return res
          .status(404)
          .json({ message: "Ledger not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Ledger deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const ledger = await this.service.getById(req.params.id, req.user.tenant_id, req.db); 
      if (!ledger) {
        return res
          .status(404)
          .json({ message: "Ledger not found or not authorized" });
      }
      res.json(ledger);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = req.query;
      const ledgers = await this.service.getAll(req.user.tenant_id, filters, req.db); 
      res.json(ledgers);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const filters = req.query;
      const data = await this.service.getPaginatedByTenantId(
        req.user.tenant_id, 
        filters,
        req.db
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getReport(req, res, next) {
    try {
      const filters = req.query;
      const data = await this.service.getReport(req.user.tenant_id, filters, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyReport(req, res, next) {
    try {
      const filters = req.query;
      const data = await this.service.getMonthlyReport(req.user.tenant_id, filters, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = LedgerController;