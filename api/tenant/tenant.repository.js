class TenantRepository {

  async create(db, tenantData) {
    const { name, type, plan } = tenantData
    const { rows } = await db.query(
      `INSERT INTO tenant (name, type, plan)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, type, plan]
    )
    return rows[0]
  }

  async getAll(db, filters = {}) {
    const { sort, ...otherFilters } = filters

    let whereClause = ''
    const params = []
    let paramIndex = 1

    Object.keys(otherFilters).forEach((key) => {
      if (otherFilters[key] != null && otherFilters[key] !== '') {
        whereClause += whereClause.length === 0 ? ' WHERE ' : ' AND '
        if (key === 'name') {
          whereClause += `t.${key} ILIKE $${paramIndex}`
          params.push(`%${otherFilters[key]}%`)
        } else {
          whereClause += `t.${key} = $${paramIndex}`
          params.push(otherFilters[key])
        }
        paramIndex++
      }
    })

    const sortOrder = sort
      ? `ORDER BY t.${sort.replace('-', '')} ${
          sort.startsWith('-') ? 'DESC' : 'ASC'
        }`
      : 'ORDER BY t.created_at DESC'

    const query = `
      SELECT t.*
      FROM tenant t
      ${whereClause}
      ${sortOrder}`

    const { rows } = await db.query(query, params)
    return rows
  }

  async getAllWithAdminUser(db, filters = {}) {
    const { sort, ...otherFilters } = filters

    let whereClause = "WHERE r.name = 'admin'"
    const params = []
    let paramIndex = 1

    Object.keys(otherFilters).forEach((key) => {
      if (otherFilters[key] != null && otherFilters[key] !== '') {
        whereClause += ' AND '
        const tableAlias = 'u'

        if (key === 'name') {
          whereClause += `${tableAlias}.${key} ILIKE $${paramIndex}`
          params.push(`%${otherFilters[key]}%`)
        } else {
          whereClause += `${tableAlias}.${key} = $${paramIndex}`
          params.push(otherFilters[key])
        }
        paramIndex++
      }
    })

    const sortOrder = sort
      ? `ORDER BY u.${sort.replace('-', '')} ${
          sort.startsWith('-') ? 'DESC' : 'ASC'
        }`
      : 'ORDER BY u.created_at DESC'

    const query = `
      SELECT 
          t.*,
          u.username,
          u.password
      FROM 
          "user" u
      INNER JOIN 
          tenant t ON u.tenant_id = t.id
      INNER JOIN
          "role" r ON u.role_id = r.id
      ${whereClause}
      ${sortOrder}`

    const { rows } = await db.query(query, params)
    return rows
  }

  async getById(db, id) {
    const { rows } = await db.query(`
      SELECT t.*
      FROM tenant t
      WHERE t.id = $1
    `, [id])
    return rows[0]
  }

  async update(db, id, data) {
    const validFields = ['name', 'type', 'plan'];
    const fields = Object.keys(data).filter(key => validFields.includes(key));
    const values = fields.map(key => data[key]);

    if (fields.length === 0) {
      return this.getById(db, id)  
    }

    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(', ')

    const query = `
      UPDATE tenant
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *`

    const queryValues = [...values, id]

    const { rows } = await db.query(query, queryValues)
    return rows[0]
  }

  async delete(db, id) {
    const { rows } = await db.query(
      'DELETE FROM tenant WHERE id = $1 RETURNING id',
      [id]
    )
    return rows[0]
  }
}

module.exports = TenantRepository