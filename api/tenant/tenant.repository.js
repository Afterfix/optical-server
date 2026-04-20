class TenantRepository {
  constructor(db) {
    this.db = db
  }

  async create(tenantData) {
    // Default to 'optical' if 'type' is not provided in the request body
    const { name, type = 'optical', plan } = tenantData
    const { rows } = await this.db.query(
      `INSERT INTO tenant (name, type, plan)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, type, plan]
    )
    return rows[0]
  }

  async getAll(filters = {}) {
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
      SELECT *
      FROM tenant t
      ${whereClause}
      ${sortOrder}`

    const { rows } = await this.db.query(query, params)
    return rows
  }

  async getAllWithAdminUser(filters = {}) {
    const { sort, ...otherFilters } = filters

    // Start the whereClause with the mandatory role condition
    let whereClause = "WHERE r.name = 'admin'"
    const params = []
    let paramIndex = 1

    // Update the dynamic filter logic
    Object.keys(otherFilters).forEach((key) => {
      if (otherFilters[key] != null && otherFilters[key] !== '') {
        // All dynamic filters are added with AND, after the initial WHERE condition
        whereClause += ' AND '

        // Assuming filters apply to the 'user' table (u) as it's the filtered entity
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

    // Update the sort logic to use the user table alias 'u'
    const sortOrder = sort
      ? `ORDER BY u.${sort.replace('-', '')} ${
          sort.startsWith('-') ? 'DESC' : 'ASC'
        }`
      : 'ORDER BY u.created_at DESC' // Default sort on user table created_at

    // Updated Query:
    // 1. Selects ALL tenant fields (t.*).
    // 2. Appends specific user fields (u.username, u.password).
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

    const { rows } = await this.db.query(query, params)
    return rows
  }

  async getById(id) {
    const { rows } = await this.db.query('SELECT * FROM tenant WHERE id = $1', [
      id,
    ])
    return rows[0]
  }

  async update(id, data) {
    const fields = Object.keys(data)
    const values = Object.values(data)

    if (fields.length === 0) {
      return this.getById(id)
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

    const { rows } = await this.db.query(query, queryValues)
    return rows[0]
  }

  async delete(id) {
    const { rows } = await this.db.query(
      'DELETE FROM tenant WHERE id = $1 RETURNING id',
      [id]
    )
    return rows[0]
  }
}

module.exports = TenantRepository