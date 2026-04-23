class CategoryService {
  constructor(categoryRepository, tenantRepository) {
    this.categoryRepository = categoryRepository;
    this.tenantRepository = tenantRepository;
  }

  // ✅ GET ALL
  async getAll(user, filters = {}, db) {
    let tenantId;

    if (user.role === "super_admin") {
      tenantId = filters.tenant_id || null;
    } else {
      tenantId = user.tenant_id;
    }

    return await this.categoryRepository.getAllByTenantId(
      db,
      tenantId,
      filters,
    );
  }

  // ✅ CREATE CATEGORY WITH CUSTOM FIELDS
  async create(categoryData, user, db) {
    const { custom_fields, ...category } = categoryData;

    const tenantId =
      user.role === "super_admin" ? categoryData.tenant_id : user.tenant_id;

    // 🔒 Validate tenant for super_admin
    if (user.role === "super_admin") {
      if (!categoryData.tenant_id) {
        throw new Error("tenant_id is required for super_admin");
      }

      const tenantExists = await this.tenantRepository.getById(
        db,
        categoryData.tenant_id,
      );
      if (!tenantExists) {
        throw new Error("Invalid tenant_id");
      }
    }

    // 🔒 Validate custom fields
    if (custom_fields) {
      for (const field of custom_fields) {
        if (!field.label || !field.type) {
          throw new Error("Each custom field must have label and type");
        }
      }
    }

    // ✅ Create category
    const createdCategory = await this.categoryRepository.create(db, {
      ...category,
      tenant_id: tenantId,
    });

    // ✅ Insert custom fields
    if (custom_fields && custom_fields.length > 0) {
      for (const field of custom_fields) {
        await db.query(
          `INSERT INTO category_custom_fields
          (tenant_id, category_id, label, type, is_required)
          VALUES ($1, $2, $3, $4, $5)`,
          [
            tenantId,
            createdCategory.id,
            field.label,
            field.type,
            field.is_required || false,
          ],
        );
      }
    }

    return {
      status: "success",
      data: createdCategory,
    };
  }

  // ✅ GET CATEGORY WITH FIELDS
  async getById(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;

    return await this.categoryRepository.getById(db, id, tenantId);
  }

  // ✅ UPDATE CATEGORY + CUSTOM FIELDS
  async update(id, categoryData, user, db) {
    const { tenant_id, custom_fields, ...updateData } = categoryData;

    const tenantIdToUpdate =
      user.role === "super_admin" ? null : user.tenant_id;

    // ✅ Update category basic data
    const updatedCategory = await this.categoryRepository.update(
      db,
      id,
      tenantIdToUpdate,
      updateData,
    );

    if (!updatedCategory) {
      throw new Error("Category not found or not authorized to update");
    }

    // 🔥 Handle custom fields update
    if (custom_fields) {
      // 🔒 Validate fields
      for (const field of custom_fields) {
        if (!field.label || !field.type) {
          throw new Error("Each custom field must have label and type");
        }
      }

      // 🧹 Remove old fields
      await db.query(
        `DELETE FROM category_custom_fields WHERE category_id = $1`,
        [id],
      );

      // ➕ Insert new fields
      for (const field of custom_fields) {
        await db.query(
          `INSERT INTO category_custom_fields
          (tenant_id, category_id, label, type, is_required)
          VALUES ($1, $2, $3, $4, $5)`,
          [
            user.tenant_id,
            id,
            field.label,
            field.type,
            field.is_required || false,
          ],
        );
      }
    }

    const data = await this.getById(id, user, db);

    return {
      status: "success",
      data,
    };
  }

  // ✅ DELETE CATEGORY (FIELDS AUTO-DELETED via CASCADE)
  async delete(id, user, db) {
    const tenantIdToDelete =
      user.role === "super_admin" ? null : user.tenant_id;

    const data = await this.categoryRepository.delete(db, id, tenantIdToDelete);

    return {
      status: "success",
      data,
    };
  }
}

module.exports = CategoryService;
