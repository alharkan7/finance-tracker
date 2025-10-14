import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
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

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Build query parameters
    const queryParams: any[] = [parseInt(userId)]
    let whereClause = 'WHERE user_id = $1'
    let paramIndex = 2

    if (startDate) {
      whereClause += ` AND date >= $${paramIndex}`
      queryParams.push(startDate)
      paramIndex++
    }

    if (endDate) {
      whereClause += ` AND date <= $${paramIndex}`
      queryParams.push(endDate)
      paramIndex++
    }

    // Fetch user details, expenses, and incomes
    const [userResult, expensesResult, incomesResult] = await Promise.all([
      db.query('SELECT id, email, avatar, created_at, last_login FROM finance_tracker WHERE id = $1', [parseInt(userId)]),
      db.query(`SELECT * FROM expenses ${whereClause} ORDER BY date DESC`, queryParams),
      db.query(`SELECT * FROM incomes ${whereClause} ORDER BY date DESC`, queryParams)
    ])

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    // Hide specific user from admin dashboard
    if (user.email === 'raihankalla@gmail.com') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    const expenses = expensesResult.rows
    const incomes = incomesResult.rows

    // Calculate category summaries for expenses
    const expenseByCategory: { [key: string]: number } = {}
    expenses.forEach((expense: any) => {
      if (expense.category) {
        expenseByCategory[expense.category] = (expenseByCategory[expense.category] || 0) + parseFloat(expense.amount)
      }
    })

    // Calculate category summaries for incomes
    const incomeByCategory: { [key: string]: number } = {}
    incomes.forEach((income: any) => {
      if (income.category) {
        incomeByCategory[income.category] = (incomeByCategory[income.category] || 0) + parseFloat(income.amount)
      }
    })

    // Calculate totals
    const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0)
    const totalIncomes = incomes.reduce((sum: number, inc: any) => sum + parseFloat(inc.amount), 0)

    return NextResponse.json({
      user,
      expenses,
      incomes,
      expenseByCategory,
      incomeByCategory,
      summary: {
        totalExpenses,
        totalIncomes,
        balance: totalIncomes - totalExpenses,
        expenseCount: expenses.length,
        incomeCount: incomes.length
      }
    })
  } catch (error: any) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user details', details: error.message },
      { status: 500 }
    )
  }
}

