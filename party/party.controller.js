class PartyController {
  constructor(partyService) {
    this.service = partyService;
  }

  async getAll(req, res, next) {
    try {
      // CHANGED: Pass req.db
      const data = await this.service.getAll(req.user, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      // CHANGED: Pass req.db
      const data = await this.service.getPaginatedByTenantId(
        req.user,
        req.query,
        req.db,
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      // CHANGED: Pass req.db
      const newParty = await this.service.create(req.body, req.user, req.db);
      res.status(201).json(newParty);
    } catch (error) {
      if (error.message.includes("already taken")) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      // CHANGED: Pass req.db
      const party = await this.service.getById(
        req.params.id,
        req.user.tenant_id,
        req.db,
      );
      res.json(party);
    } catch (error) {
      if (error.message.includes("not found")) {
        return res
          .status(404)
          .json({ message: "Party not found or not authorized" });
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      // CHANGED: Pass req.db
      const updatedParty = await this.service.update(
        req.params.id,
        req.user,
        req.body,
        req.db,
      );
      if (!updatedParty) {
        return res
          .status(404)
          .json({ message: "Party not found or not authorized to update" });
      }
      res.json(updatedParty);
    } catch (error) {
      if (error.message.includes("already Exist")) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      // CHANGED: Pass req.db
      const result = await this.service.delete(req.params.id, req.user, req.db);
      if (!result) {
        return res
          .status(404)
          .json({ message: "Party not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Party deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PartyController;
