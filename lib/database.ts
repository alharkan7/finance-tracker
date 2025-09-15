import { db } from './supabase'
import { 
  FinanceTrackerUser, 
  CreateFinanceTrackerUser, 
  UpdateFinanceTrackerUser,
  UserQueryFilters,
  PaginationOptions,
  PaginatedResult,
  SchemaHelpers,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES
} from '../schema/schema'

export class DatabaseService {
  /**
   * Find user by email
   */
  static async findUserByEmail(email: string): Promise<FinanceTrackerUser | null> {
    try {
      const result = await db.query(
        'SELECT * FROM finance_tracker WHERE email = $1',
        [email]
      )

      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0] as FinanceTrackerUser
    } catch (error) {
      console.error('Error finding user by email:', error)
      throw error
    }
  }

  /**
   * Find user by ID
   */
  static async findUserById(id: number): Promise<FinanceTrackerUser | null> {
    try {
      const result = await db.query(
        'SELECT * FROM finance_tracker WHERE id = $1',
        [id]
      )

      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0] as FinanceTrackerUser
    } catch (error) {
      console.error('Error finding user by ID:', error)
      throw error
    }
  }

  /**
   * Create a new user
   */
  static async createUser(userData: CreateFinanceTrackerUser): Promise<FinanceTrackerUser> {
    try {
      // Set default categories if not provided
      const userWithDefaults = {
        ...userData,
        expense_categories: userData.expense_categories || DEFAULT_EXPENSE_CATEGORIES,
        income_categories: userData.income_categories || DEFAULT_INCOME_CATEGORIES,
        monthly_budget: userData.monthly_budget || 0,
        preferences: userData.preferences || {},
        is_active: userData.is_active !== undefined ? userData.is_active : true
      }

      const result = await db.query(
        `INSERT INTO finance_tracker 
         (email, avatar, sheet_id, expense_categories, income_categories, monthly_budget, preferences, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          userWithDefaults.email,
          userWithDefaults.avatar || null,
          userWithDefaults.sheet_id || null,
          JSON.stringify(userWithDefaults.expense_categories),
          JSON.stringify(userWithDefaults.income_categories),
          userWithDefaults.monthly_budget,
          JSON.stringify(userWithDefaults.preferences),
          userWithDefaults.is_active
        ]
      )

      const newUser = result.rows[0] as FinanceTrackerUser
      console.log('Created new user in database:', newUser.email)
      return newUser
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  /**
   * Update user data
   */
  static async updateUser(id: number, updates: Partial<UpdateFinanceTrackerUser>): Promise<FinanceTrackerUser> {
    try {
      // Build dynamic update query
      const updateFields = Object.keys(updates).filter(key => key !== 'id')
      const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ')
      const values = updateFields.map(field => (updates as any)[field])
      values.push(id) // for WHERE clause

      const result = await db.query(
        `UPDATE finance_tracker SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        throw new Error(`User not found with id: ${id}`)
      }

      return result.rows[0] as FinanceTrackerUser
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  /**
   * Update user's last login timestamp
   */
  static async updateLastLogin(email: string): Promise<void> {
    try {
      await db.query(
        'UPDATE finance_tracker SET last_login = NOW(), updated_at = NOW() WHERE email = $1',
        [email]
      )
    } catch (error) {
      console.error('Error updating last login:', error)
      // Don't throw error for last login update failure
    }
  }

  /**
   * Set user's Google Sheet ID
   */
  static async setUserSheetId(email: string, sheetId: string): Promise<FinanceTrackerUser> {
    try {
      const result = await db.query(
        'UPDATE finance_tracker SET sheet_id = $1, updated_at = NOW() WHERE email = $2 RETURNING *',
        [sheetId, email]
      )

      if (result.rows.length === 0) {
        throw new Error(`User not found: ${email}`)
      }

      console.log('Updated sheet ID for user:', email)
      return result.rows[0] as FinanceTrackerUser
    } catch (error) {
      console.error('Error setting user sheet ID:', error)
      throw error
    }
  }

  /**
   * Get user's Google Sheet ID
   */
  static async getUserSheetId(email: string): Promise<string | null> {
    try {
      const user = await this.findUserByEmail(email)
      return user?.sheet_id || null
    } catch (error) {
      console.error('Error getting user sheet ID:', error)
      throw error
    }
  }

  /**
   * Remove user's Google Sheet ID
   */
  static async removeUserSheetId(email: string): Promise<FinanceTrackerUser> {
    try {
      const result = await db.query(
        'UPDATE finance_tracker SET sheet_id = NULL, updated_at = NOW() WHERE email = $1 RETURNING *',
        [email]
      )

      if (result.rows.length === 0) {
        throw new Error(`User not found: ${email}`)
      }

      return result.rows[0] as FinanceTrackerUser
    } catch (error) {
      console.error('Error removing user sheet ID:', error)
      throw error
    }
  }

  /**
   * Find or create user (used in authentication flow)
   */
  static async findOrCreateUser(email: string, avatar?: string): Promise<FinanceTrackerUser> {
    try {
      // First try to find existing user
      let user = await this.findUserByEmail(email)
      
      if (user) {
        // Update last login and avatar if provided
        await this.updateLastLogin(email)
        
        if (avatar && avatar !== user.avatar) {
          const result = await db.query(
            'UPDATE finance_tracker SET avatar = $1, updated_at = NOW() WHERE email = $2 RETURNING *',
            [avatar, email]
          )
          user = result.rows[0] as FinanceTrackerUser
        }
        
        return user
      }

      // Create new user if not found
      const newUserData = SchemaHelpers.createDefaultUser(email, avatar)
      return await this.createUser(newUserData)
    } catch (error) {
      console.error('Error in findOrCreateUser:', error)
      throw error
    }
  }

  /**
   * Get users with filters and pagination
   */
  static async getUsers(
    filters?: UserQueryFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<FinanceTrackerUser>> {
    try {
      let whereClause = 'WHERE 1=1'
      const queryParams: any[] = []
      let paramIndex = 1

      // Apply filters
      if (filters) {
        if (filters.email) {
          whereClause += ` AND email = $${paramIndex}`
          queryParams.push(filters.email)
          paramIndex++
        }
        if (filters.is_active !== undefined) {
          whereClause += ` AND is_active = $${paramIndex}`
          queryParams.push(filters.is_active)
          paramIndex++
        }
        if (filters.has_sheet !== undefined) {
          if (filters.has_sheet) {
            whereClause += ` AND sheet_id IS NOT NULL`
          } else {
            whereClause += ` AND sheet_id IS NULL`
          }
        }
      }

      // Apply ordering
      const orderBy = pagination?.order_by || 'created_at'
      const orderDirection = pagination?.order_direction || 'DESC'
      const orderClause = `ORDER BY ${orderBy} ${orderDirection}`

      // Apply pagination
      const limit = pagination?.limit || 50
      const offset = pagination?.offset || 0
      const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      queryParams.push(limit, offset)

      // Get data
      const dataQuery = `SELECT * FROM finance_tracker ${whereClause} ${orderClause} ${limitClause}`
      const dataResult = await db.query(dataQuery, queryParams)

      // Get count
      const countQuery = `SELECT COUNT(*) FROM finance_tracker ${whereClause}`
      const countResult = await db.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
      const totalCount = parseInt(countResult.rows[0].count)

      return {
        data: dataResult.rows as FinanceTrackerUser[],
        total: totalCount,
        limit,
        offset,
        has_more: totalCount > offset + limit
      }
    } catch (error) {
      console.error('Error getting users:', error)
      throw error
    }
  }

  /**
   * Update user categories
   */
  static async updateUserCategories(
    email: string,
    expenseCategories?: any[],
    incomeCategories?: any[]
  ): Promise<FinanceTrackerUser> {
    try {
      let query = 'UPDATE finance_tracker SET updated_at = NOW()'
      const params: any[] = []
      let paramIndex = 1

      if (expenseCategories) {
        query += `, expense_categories = $${paramIndex}`
        params.push(JSON.stringify(expenseCategories))
        paramIndex++
      }
      if (incomeCategories) {
        query += `, income_categories = $${paramIndex}`
        params.push(JSON.stringify(incomeCategories))
        paramIndex++
      }

      query += ` WHERE email = $${paramIndex} RETURNING *`
      params.push(email)

      const result = await db.query(query, params)
      
      if (result.rows.length === 0) {
        throw new Error(`User not found: ${email}`)
      }

      return result.rows[0] as FinanceTrackerUser
    } catch (error) {
      console.error('Error updating user categories:', error)
      throw error
    }
  }

  /**
   * Update user budget
   */
  static async updateUserBudget(email: string, monthlyBudget: number): Promise<FinanceTrackerUser> {
    try {
      const result = await db.query(
        'UPDATE finance_tracker SET monthly_budget = $1, updated_at = NOW() WHERE email = $2 RETURNING *',
        [monthlyBudget, email]
      )
      
      if (result.rows.length === 0) {
        throw new Error(`User not found: ${email}`)
      }

      return result.rows[0] as FinanceTrackerUser
    } catch (error) {
      console.error('Error updating user budget:', error)
      throw error
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    email: string, 
    preferences: Record<string, any>
  ): Promise<FinanceTrackerUser> {
    try {
      const result = await db.query(
        'UPDATE finance_tracker SET preferences = $1, updated_at = NOW() WHERE email = $2 RETURNING *',
        [JSON.stringify(preferences), email]
      )
      
      if (result.rows.length === 0) {
        throw new Error(`User not found: ${email}`)
      }

      return result.rows[0] as FinanceTrackerUser
    } catch (error) {
      console.error('Error updating user preferences:', error)
      throw error
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(email: string): Promise<FinanceTrackerUser> {
    try {
      const result = await db.query(
        'UPDATE finance_tracker SET is_active = false, updated_at = NOW() WHERE email = $1 RETURNING *',
        [email]
      )
      
      if (result.rows.length === 0) {
        throw new Error(`User not found: ${email}`)
      }

      return result.rows[0] as FinanceTrackerUser
    } catch (error) {
      console.error('Error deactivating user:', error)
      throw error
    }
  }
}

