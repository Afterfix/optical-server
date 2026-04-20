class PrescriptionController {
  constructor(prescriptionService) {
    this.service = prescriptionService;
  }

  async getAll(req, res, next) {
    try {
      const prescriptions = await this.service.getAll(req.user, req.query, req.db);
      res.json(prescriptions);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const newPrescription = await this.service.create(req.body, req.user, req.db);
      res.status(201).json(newPrescription);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const data = await this.service.getAllPaginated(req.user, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const prescription = await this.service.getById(req.params.id, req.user, req.db);
      if (!prescription) {
        return res
          .status(404)
          .json({ message: "Prescription not found or not authorized" });
      }
      res.json(prescription);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await this.service.update(
        req.params.id,
        req.body,
        req.user,
        req.db
      );
      if (!updated) {
        return res
          .status(404)
          .json({ message: "Prescription not found or not authorized to update" });
      }
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await this.service.delete(req.params.id, req.user, req.db);
      if (!result) {
        return res
          .status(404)
          .json({ message: "Prescription not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Prescription deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PrescriptionController;