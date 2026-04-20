class SalesController {
    constructor(service) {
        this.service = service;
    }

    async getAll(req, res, next) {
        try {
            const filters = req.query;
            const data = await this.service.getAll(req.user.tenant_id, filters, req.db);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }
    
    async getAllPaginated(req, res, next) {
        try {
            const filters = req.query;
            const data = await this.service.getPaginatedBytenantId(req.user.tenant_id, filters, req.db);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const sales = await this.service.getById(req.params.id, req.user.tenant_id, req.db);
            res.json(sales);
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const newSales = await this.service.create(req.user, req.body, req.db);
            res.status(201).json(newSales);
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const updatedSales = await this.service.update(req.params.id, req.user, req.body, req.db);
            res.json(updatedSales);
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await this.service.delete(req.params.id, req.user, req.db);
            res.status(200).json({ message: 'Sales removed successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = SalesController;