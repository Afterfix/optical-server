class ModeOfPaymentController {
    constructor(modeOfPaymentService) {
        this.service = modeOfPaymentService;
    }

    async getAll(req, res, next) {
        try {
            // PASS req.db
            const data = await this.service.getAll(req.user, req.query, req.db); 
            res.json(data);
        } catch (error) {
            next(error);
        }
    }
    
    async create(req, res, next) {
        try {
            // PASS req.db
            const newModeOfPayment = await this.service.create(req.user, req.body, req.db);
            res.status(201).json(newModeOfPayment);
        } catch (error) {
            if (error.message.includes('already exists')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            // PASS req.db
            const modeOfPayment = await this.service.getById(req.user, req.params.id, req.db);
            res.json(modeOfPayment);
        } catch (error) {
             if (error.message.includes('not found')) {
                return res.status(404).json({ message: 'ModeOfPayment not found' });
            }
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            // PASS req.db
            const updatedModeOfPayment = await this.service.update(req.user, req.params.id, req.body, req.db);
            if (!updatedModeOfPayment) {
                return res.status(404).json({ message: 'ModeOfPayment not found' });
            }
            res.json(updatedModeOfPayment);
        } catch (error) {
            if (error.message.includes('already taken')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            // PASS req.db
            const result = await this.service.delete(req.user, req.params.id, req.db);
            if (!result) {
                return res.status(404).json({ message: 'ModeOfPayment not found' });
            }
            res.status(200).json({ message: 'ModeOfPayment deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ModeOfPaymentController;