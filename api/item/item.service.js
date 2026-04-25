const {
  moveItemImage,
  deleteItemImageDirectory,
} = require("../../middlewares/upload");

class ItemService {
  constructor(itemRepository, customFieldsRepo) {
    this.itemRepository = itemRepository;
    this.customFieldsRepo = customFieldsRepo;
  }

  async create(itemData, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 1. Barcode check (Using the client)
      if (itemData.bar_code) {
        const existingItem = await this.itemRepository.findByBarcode(
          client,
          itemData.bar_code,
          itemData.tenant_id,
        );
        if (existingItem) {
          const error = new Error(
            `Barcode '${itemData.bar_code}' already exists.`,
          );
          error.statusCode = 409;
          throw error;
        }
      }

      // 2. Pricing logic
      if (
        itemData.selling_price_with_tax !== undefined &&
        itemData.tax !== undefined
      ) {
        const sellingPriceWithTax = parseFloat(itemData.selling_price_with_tax);
        const taxPercentage = parseFloat(itemData.tax);
        if (!isNaN(sellingPriceWithTax) && !isNaN(taxPercentage)) {
          itemData.selling_price =
            sellingPriceWithTax / (1 + taxPercentage / 100);
        }
      }

      const imageFile = itemData.imageFile;
      delete itemData.imageFile;
      itemData.image = null;

      let customFields = itemData.ItemCustomFields;
      if (typeof customFields === "string") {
        try {
          customFields = JSON.parse(customFields);
        } catch (e) {
          customFields = [];
        }
      }
      delete itemData.ItemCustomFields;

      // 3. Create Item
      const newItem = await this.itemRepository.create(client, itemData);

      // 3.5 Handle Custom Fields
      if (customFields && Array.isArray(customFields) && customFields.length > 0) {
        const payload = customFields.map(f => ({
          tenant_id: newItem.tenant_id,
          item_id: newItem.id,
          field_id: f.field_id,
          value: f.value || null
        }));
        await this.customFieldsRepo.bulkInsert(client, payload);
      }

      // 4. Handle Image
      if (imageFile) {
        let imageUrl = await moveItemImage(
          imageFile,
          newItem.tenant_id,
          newItem.id,
        );
        if (imageUrl && imageUrl.startsWith('http')) {
          newItem.image = imageUrl;
        } else {
          newItem.image = `uploads/${imageUrl}`.replace(/\\/g, "/");
        }
        // Update the item with the image path
        await this.itemRepository.update(
          client,
          newItem.id,
          newItem.tenant_id,
          { image: newItem.image },
        );
      }

      await client.query("COMMIT");
      return { status: "success", data: newItem };
    } catch (error) {
      await client.query("ROLLBACK");
      // Handle Unique Constraint (Postgres code 23505)
      if (error.code === "23505") {
        throw new Error(`An item with this name/identifier already exists.`);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id, tenantId, itemData, db) {
    try {
      // Clean Read-Only fields
      const readOnlyFields = [
        "party_name",
        "party_phone",
        "category_name",
        "brand_name",
        "unit_name",
        "unit_symbol",
        "created_at",
        "updated_at",
        "total_count",
        "done_by_name",
        "cost_center_name",
      ];
      readOnlyFields.forEach((field) => delete itemData[field]);

      // Logic for recalculating price
      if (
        itemData.selling_price_with_tax !== undefined ||
        itemData.tax !== undefined
      ) {
        const currentItem = await this.itemRepository.getById(db, id, tenantId);
        if (!currentItem) return null;
        const taxPercentage =
          itemData.tax !== undefined
            ? parseFloat(itemData.tax)
            : parseFloat(currentItem.tax);
        const sellingPriceWithTax =
          itemData.selling_price_with_tax !== undefined
            ? parseFloat(itemData.selling_price_with_tax)
            : parseFloat(currentItem.selling_price_with_tax);
        itemData.selling_price =
          sellingPriceWithTax / (1 + taxPercentage / 100);
      }

      // Handle Image
      if (itemData.imageFile) {
        await deleteItemImageDirectory(tenantId, id);
        let imageUrl = await moveItemImage(
          itemData.imageFile,
          tenantId,
          id,
        );
        if (imageUrl && imageUrl.startsWith('http')) {
          itemData.image = imageUrl;
        } else {
          itemData.image = `uploads/${imageUrl}`.replace(/\\/g, "/");
        }
        delete itemData.imageFile;
      }

      // Handle Custom Fields
      let customFields = itemData.ItemCustomFields;
      if (customFields) {
        if (typeof customFields === "string") {
          try {
            customFields = JSON.parse(customFields);
          } catch (e) {
            customFields = [];
          }
        }
        delete itemData.ItemCustomFields;
        
        await this.customFieldsRepo.deleteByItemId(db, id);
        
        if (customFields.length > 0) {
          const payload = customFields.map(f => ({
            tenant_id: tenantId,
            item_id: id,
            field_id: f.field_id,
            value: f.value || null
          }));
          await this.customFieldsRepo.bulkInsert(db, payload);
        }
      }

      const updatedItem = await this.itemRepository.update(
        db,
        id,
        tenantId,
        itemData,
      );
      return updatedItem ? { status: "success", data: updatedItem } : null;
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(`The item identifier or name is already taken.`);
      }
      throw error;
    }
  }

  async delete(id, tenantId, db) {
    // Pass db
    const result = await this.itemRepository.delete(db, id, tenantId);
    if (result) {
      await deleteItemImageDirectory(tenantId, id);
    }
    return {
      status: "success",
      data: result,
    };
  }

  async getById(id, tenantId, db) {
    // Pass db
    return await this.itemRepository.getById(db, id, tenantId);
  }

  async getAll(tenantId, filters, db) {
    // Pass db
    return await this.itemRepository.getAllByTenantId(db, tenantId, filters);
  }

  async getPaginatedByTenantId(tenantId, filters, db) {
    // Pass db
    const { items, totalCount } =
      await this.itemRepository.getPaginatedTenantId(db, tenantId, filters);
    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
    return {
      data: items,
      count: totalCount,
      page_count,
    };
  }
}

module.exports = ItemService;
