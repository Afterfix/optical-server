class InvoiceNumberController {
  constructor(service) {
    this.service = service
  }

  async generateNext(req, res, next) {
    try {
      const { type } = req.body

      const invoice_number = await this.service.generateNext({
        type,
        tenantId: req.user.tenant_id, 
      }, req.db) // Pass req.db
      res.json({ invoice_number })
    } catch (error) {
      next(error)
    }
  }

  async get(req, res, next) {
    try {
      const { type } = req.query

      const invoice_number = await this.service.get({
        type,
        tenantId: req.user.tenant_id, 
      }, req.db) // Pass req.db
      res.json({ invoice_number })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = InvoiceNumberController