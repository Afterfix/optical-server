
class PurchaseController {
    constructor(service) {
        this.service = service;
    }

    async getAll(req, res, next) {
        try {
            const filters = req.query;
            // Pass req.db
            const data = await this.service.getAll(req.user.tenant_id, filters, req.db);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async getAllPaginated(req, res, next) {
        try {
            const filters = req.query;
            // Pass req.db
            const data = await this.service.getPaginatedByUserId(req.user.tenant_id, filters, req.db);
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            // Pass req.db
            const newPurchase = await this.service.create(req.user, req.body, req.db);
            res.status(201).json(newPurchase);
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            // Pass req.db
            const purchase = await this.service.getById(req.params.id, req.user.tenant_id, req.db);
            res.json(purchase);
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            // Pass req.db
            const updatedPurchase = await this.service.update(req.params.id, req.user, req.body, req.db);
            res.json(updatedPurchase);
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            // Pass req.db
            await this.service.delete(req.params.id, req.user, req.db);
            res.status(200).json({ message: 'Purchase removed successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = PurchaseController;