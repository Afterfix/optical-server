class ModeOfPaymentService {
  constructor(modeOfPaymentRepository) {
    this.modeOfPaymentRepository = modeOfPaymentRepository;
  }

  async getAll(user, filters, db) {
    return await this.modeOfPaymentRepository.getAll(
      db,
      user.tenant_id,
      filters,
    );
  }

  async create(user, modeOfPaymentData, db) {
    try {
      const dataToSave = { ...modeOfPaymentData, tenant_id: user.tenant_id };
      const newModeOfPayment = await this.modeOfPaymentRepository.create(
        db,
        dataToSave,
      );

      return {
        status: "success",
        data: newModeOfPayment,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(
          `A mode of payment named "${modeOfPaymentData.name}" already exists.`,
        );
      }
      throw error;
    }
  }

  async getById(user, id, db) {
    const modeOfPayment = await this.modeOfPaymentRepository.getById(
      db,
      id,
      user.tenant_id,
    );
    if (!modeOfPayment) {
      throw new Error("Mode of payment not found");
    }
    return modeOfPayment;
  }

  async update(user, id, modeOfPaymentData, db) {
    try {
      const updatedModeOfPayment = await this.modeOfPaymentRepository.update(
        db,
        id,
        user.tenant_id,
        modeOfPaymentData,
      );

      if (!updatedModeOfPayment) {
        return null;
      }

      return {
        status: "success",
        data: updatedModeOfPayment,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(
          `The name "${modeOfPaymentData.name}" is already taken.`,
        );
      }
      throw error;
    }
  }

  async delete(user, id, db) {
    const data = await this.modeOfPaymentRepository.delete(
      db,
      id,
      user.tenant_id,
    );
    return {
      status: "success",
      data,
    };
  }
}

module.exports = ModeOfPaymentService;
