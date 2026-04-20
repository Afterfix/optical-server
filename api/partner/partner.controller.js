class PartnerController {
  constructor(partnerService) {
    this.service = partnerService;
  }

  async create(req, res, next) {
    try {
      let tenantId;

      if (req.user.role === 'super_admin' && req.body.tenant_id) {
        tenantId = req.body.tenant_id;
      } else {
        tenantId = req.user.tenant_id;
      }

      if (tenantId === null || tenantId === undefined) {
        return res.status(400).json({
          message: 'Cannot create partner: Tenant ID is missing or not authorized.',
        });
      }

      const partnerData = {
        ...req.body,
        tenant_id: tenantId, 
      };

      // Pass req.db
      const newPartner = await this.service.create(partnerData, req.db);
      res.status(201).json(newPartner);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      let tenantId = req.user.tenant_id;

      if (req.user.role === 'super_admin' && req.query.tenant_id) {
        tenantId = req.query.tenant_id;
      } else if (req.user.role === 'super_admin' && !req.query.tenant_id) {
        tenantId = null; 
      }

      // Pass req.db
      const data = await this.service.getAll(tenantId, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      let tenantId = req.user.tenant_id;
      const filters = req.query;

      if (req.user.role === 'super_admin' && filters.tenant_id) {
        tenantId = filters.tenant_id;
      } else if (req.user.role === 'super_admin' && !filters.tenant_id) {
        tenantId = null; 
      }
      
      // Pass req.db
      const data = await this.service.getPaginatedByTenantId(
        tenantId,
        filters,
        req.db
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      // Pass req.db
      const partner = await this.service.getById(
        req.params.id,
        req.user.tenant_id,
        req.db
      );
      if (!partner) {
        return res
          .status(404)
          .json({ message: "Partner not found or not authorized" });
      }
      res.json(partner);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      // Pass req.db
      const updatedPartner = await this.service.update(
        req.params.id,
        req.user.tenant_id,
        req.body,
        req.db
      );
      if (!updatedPartner) {
        return res
          .status(404)
          .json({ message: "Partner not found or not authorized to update" });
      }
      res.json(updatedPartner);
    } catch (error) {
      if (error.message.includes('already taken')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      // Pass req.db
      const result = await this.service.delete(
        req.params.id,
        req.user.tenant_id,
        req.db
      );
      if (!result) {
        return res
          .status(404)
          .json({ message: "Partner not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Partner deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PartnerController;