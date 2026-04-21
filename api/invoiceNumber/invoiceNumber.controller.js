class InvoiceNumberController {
  constructor(service) {
    this.service = service;
  }

  async generateNext(req, res, next) {
    try {
      const { type } = req.body;

      const invoice_number = await this.service.generateNext(
        {
          type,
          tenantId: req.user.tenant_id,
        },
        req.db,
      ); // Pass req.db
      res.json({ invoice_number });
    } catch (error) {
      next(error);
    }
  }

  async get(req, res, next) {
    try {
      // Also ensure req.user exists before accessing tenant_id
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized: User session not found" });
      }

      // Safely get type from query or body
      const type = req.query?.type || req.body?.type;

      if (type) {
        // If type is provided, return a single formatted invoice number object
        // for backward compatibility with transaction hooks.
        const invoice_number = await this.service.get({
          type,
          tenantId: req.user.tenant_id, 
        }, req.db);
        
        return res.json({ invoice_number });
      } else {
        // If no type is provided, return all sequences for the tenant
        // for the InvoiceNumberList page.
        const sequences = await this.service.getAll(req.user.tenant_id, req.db);
        return res.json(sequences);
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InvoiceNumberController;
