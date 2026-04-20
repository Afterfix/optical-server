class TenantController {
    constructor(tenantService) {
        this.service = tenantService;
    }

    async create(req, res, next) {
        try {
            const newTenant = await this.service.create(req.body, req.db);
            res.status(201).json(newTenant);
        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const data = await this.service.getAll(req.query, req.db);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const tenant = await this.service.getById(req.params.id, req.db);
            if (!tenant) {
                return res.status(404).json({ message: 'Tenant not found' });
            }
            res.json(tenant);
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const updatedTenant = await this.service.update(req.params.id, req.body, req.db);
            if (!updatedTenant) {
                return res.status(404).json({ message: 'Tenant not found' });
            }
            res.json(updatedTenant);
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await this.service.delete(req.params.id, req.db);
            if (!result) {
                return res.status(404).json({ message: 'Tenant not found' });
            }
            res.status(200).json({ message: 'Tenant deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = TenantController;