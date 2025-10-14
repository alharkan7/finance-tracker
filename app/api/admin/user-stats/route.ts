import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/postgres'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build query for user statistics
    let expenseQuery = 'SELECT user_id, COUNT(*) as count FROM expenses'
    let incomeQuery = 'SELECT user_id, COUNT(*) as count FROM incomes'
    let totalDaysQuery = `
      SELECT user_id, COUNT(DISTINCT date) as total_days
      FROM (
        SELECT user_id, date FROM expenses
        UNION
        SELECT user_id, date FROM incomes
      ) combined_dates
      GROUP BY user_id
    `

    const queryParams: any[] = []
    let whereClause = ''
    let paramIndex = 1

    if (startDate || endDate) {
      whereClause = ' WHERE'
      if (startDate) {
        whereClause += ` date >= $${paramIndex}`
        queryParams.push(startDate)
        paramIndex++
      }
      if (endDate) {
        if (startDate) whereClause += ' AND'
        whereClause += ` date <= $${paramIndex}`
        queryParams.push(endDate)
        paramIndex++
      }
    }

    expenseQuery += whereClause + ' GROUP BY user_id'
    incomeQuery += whereClause + ' GROUP BY user_id'

    // For total days, we need to apply the date filter to the combined query
    let totalDaysParams: any[] = []
    if (startDate || endDate) {
      // Build WHERE clause for the UNION query with separate parameters for each side
      // Each SELECT in the UNION needs its own set of parameters
      let expenseWhere = ''
      let incomeWhere = ''
      let expenseParamIndex = 1
      let incomeParamIndex = 1 + queryParams.length
      
      if (startDate) {
        expenseWhere = ` WHERE expenses.date >= $${expenseParamIndex}`
        incomeWhere = ` WHERE incomes.date >= $${incomeParamIndex}`
        expenseParamIndex++
        incomeParamIndex++
      }
      if (endDate) {
        if (startDate) {
          expenseWhere += ' AND'
          incomeWhere += ' AND'
        } else {
          expenseWhere = ' WHERE'
          incomeWhere = ' WHERE'
        }
        expenseWhere += ` expenses.date <= $${expenseParamIndex}`
        incomeWhere += ` incomes.date <= $${incomeParamIndex}`
      }
      
      totalDaysQuery = `
        SELECT user_id, COUNT(DISTINCT date) as total_days
        FROM (
          SELECT user_id, date FROM expenses${expenseWhere}
          UNION
          SELECT user_id, date FROM incomes${incomeWhere}
        ) combined_dates
        GROUP BY user_id
      `
      // Both subqueries need their parameters - duplicate them
      totalDaysParams = [...queryParams, ...queryParams]
    } else {
      totalDaysParams = []
    }

    // Fetch all statistics
    const [expenseCounts, incomeCounts, totalDays, users] = await Promise.all([
      db.query(expenseQuery, queryParams),
      db.query(incomeQuery, queryParams),
      db.query(totalDaysQuery, totalDaysParams),
      db.query('SELECT id, email, avatar, created_at, last_login FROM finance_tracker ORDER BY created_at DESC')
    ])

    // Combine statistics per user
    const userStatsMap = new Map()

    users.rows.forEach((user: any) => {
      userStatsMap.set(user.id, {
        id: user.id,
        email: user.email,
        avatar: user.avatar,
        created_at: user.created_at,
        last_login: user.last_login,
        total_records: 0,
        total_days: 0,
        expense_count: 0,
        income_count: 0
      })
    })

    // Add expense counts
    expenseCounts.rows.forEach((row: any) => {
      const userId = parseInt(row.user_id)
      const stat = userStatsMap.get(userId)
      if (stat) {
        stat.expense_count = parseInt(row.count)
        stat.total_records += parseInt(row.count)
      }
    })

    // Add income counts
    incomeCounts.rows.forEach((row: any) => {
      const userId = parseInt(row.user_id)
      const stat = userStatsMap.get(userId)
      if (stat) {
        stat.income_count = parseInt(row.count)
        stat.total_records += parseInt(row.count)
      }
    })

    // Add total unique days (combined from expenses and incomes)
    totalDays.rows.forEach((row: any) => {
      const userId = parseInt(row.user_id)
      const stat = userStatsMap.get(userId)
      if (stat) {
        stat.total_days = parseInt(row.total_days)
      }
    })

    const userStats = Array.from(userStatsMap.values())
      .filter((user: any) => user.email !== 'raihankalla@gmail.com')

    return NextResponse.json({ users: userStats })
  } catch (error: any) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user statistics', details: error.message },
      { status: 500 }
    )
  }
}

