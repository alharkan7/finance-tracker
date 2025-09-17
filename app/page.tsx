'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Bell, Settings as SettingsIcon, Zap, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { UserMenu } from './components/user-menu'
import { Chart } from './components/chart'
import { ExpenseForm } from './components/expense-form'
import { Settings } from './components/sheet-settings'
import { BudgetDrawer } from './components/budget-drawer'
import { LoadingSkeleton } from './components/loading-skeleton'
import { LoginScreen } from './components/login-screen'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Category } from '@/schema/schema'

// Types for our data (updated for PostgreSQL database structure)
interface ExpenseData {
  id?: number;
  user_id?: number;
  timestamp?: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  source?: string;
  external_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface IncomeData {
  id?: number;
  user_id?: number;
  timestamp?: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  source?: string;
  external_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface AppError {
  message: string;
  errorType: string;
  error: string;
}

// Mock data for the donut chart (will be replaced with real data)
const mockChartData = [
  { name: 'Food', value: 400, color: '#0088FE' },
  { name: 'Transport', value: 300, color: '#00C49F' },
  { name: 'Entertainment', value: 200, color: '#FFBB28' },
  { name: 'Others', value: 100, color: '#FF8042' },
]

// Cache configuration for PostgreSQL data
const CACHE_KEY_EXPENSES = 'expense_tracker_expenses_pg'
const CACHE_KEY_INCOMES = 'expense_tracker_incomes_pg'
const CACHE_KEY_BUDGETS = 'expense_tracker_budgets_pg'
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes in milliseconds (reduced for fresher data)

interface CacheData {
  data: any[]
  timestamp: number
  version?: string // Add version to invalidate old cache
}

// Cache utilities
const getCache = (key: string): CacheData | null => {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(key)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

const setCache = (key: string, data: any[]) => {
  if (typeof window === 'undefined') return
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
      version: 'postgresql' // Mark as PostgreSQL data
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch {
    // Ignore cache write errors
  }
}

const isCacheValid = (cache: CacheData | null): boolean => {
  if (!cache) return false
  
  // Invalidate cache if it's not PostgreSQL version
  if (cache.version !== 'postgresql') {
    return false
  }
  
  const age = Date.now() - cache.timestamp
  const isValid = age < CACHE_DURATION
  
  // Debug cache status
  console.log(`Cache age: ${Math.round(age / 1000)}s, Valid: ${isValid}, Duration: ${CACHE_DURATION / 1000}s`)
  
  return isValid
}

const clearCache = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY_EXPENSES)
    localStorage.removeItem(CACHE_KEY_INCOMES)
    localStorage.removeItem(CACHE_KEY_BUDGETS)
  } catch {
    // Ignore cache clear errors
  }
}

export default function MobileFinanceTracker() {
  const { data: session, status } = useSession()
  
  // Data state
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [incomes, setIncomes] = useState<IncomeData[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [chartData, setChartData] = useState(mockChartData)
  const [chartMode, setChartMode] = useState<'income' | 'expense'>('expense')
  const [chartType, setChartType] = useState<'donut' | 'line'>('donut')

  // Categories state
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerKey, setDrawerKey] = useState(0)

  // Budget drawer state
  const [isBudgetDrawerOpen, setIsBudgetDrawerOpen] = useState(false)

  // Budget data state
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [allBudgets, setAllBudgets] = useState<{[key: string]: number}>({})
  const [budgetsLoaded, setBudgetsLoaded] = useState(false)

  // Budget alert dialog state
  const [isBudgetAlertOpen, setIsBudgetAlertOpen] = useState(false)

  // Month filter state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  
  // Filter data by selected month with better error handling
  const filterDataByMonth = (data: any[]) => {
    return data.filter(item => {
      if (!item || !item.date) return false
      try {
        const itemDate = new Date(item.date)
        if (isNaN(itemDate.getTime())) return false
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
      } catch (error) {
        console.warn('Invalid date format in filterDataByMonth:', item)
        return false
      }
    })
  }

  const filteredExpenses = filterDataByMonth(expenses)
  const filteredIncomes = filterDataByMonth(incomes)

  // Calculate balance from filtered data: Budget - Expenses with better error handling
  const totalIncome = filteredIncomes.reduce((sum, income) => {
    const amount = typeof income.amount === 'number' ? income.amount : parseFloat(income.amount || '0')
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  
  const totalExpenses = filteredExpenses.reduce((sum, expense) => {
    const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || '0')
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  
  const balance = monthlyBudget - totalExpenses

  // Month navigation functions
  const getMonthName = (month: number) => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return monthNames[month]
  }

  const getDateLimits = () => {
    const allDates = [...expenses, ...incomes]
      .map(item => item.date)
      .filter(date => date)
      .map(date => new Date(date))

    if (allDates.length === 0) {
      const now = new Date()
      return {
        minDate: new Date(now.getFullYear(), now.getMonth(), 1),
        maxDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

    return {
      minDate: new Date(minDate.getFullYear(), minDate.getMonth(), 1),
      maxDate: new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const { minDate, maxDate } = getDateLimits()
    const currentDate = new Date(currentYear, currentMonth, 1)

    if (direction === 'prev') {
      const prevMonth = new Date(currentYear, currentMonth - 1, 1)
      if (prevMonth >= minDate) {
        setCurrentMonth(prevMonth.getMonth())
        setCurrentYear(prevMonth.getFullYear())
      }
    } else {
      const nextMonth = new Date(currentYear, currentMonth + 1, 1)
      if (nextMonth <= maxDate) {
        setCurrentMonth(nextMonth.getMonth())
        setCurrentYear(nextMonth.getFullYear())
      }
    }
  }

  const canNavigatePrev = () => {
    const { minDate } = getDateLimits()
    const prevMonth = new Date(currentYear, currentMonth - 1, 1)
    return prevMonth >= minDate
  }

  const canNavigateNext = () => {
    const { maxDate } = getDateLimits()
    const nextMonth = new Date(currentYear, currentMonth + 1, 1)
    return nextMonth <= maxDate
  }

  // Process budget data from the aggregated API response
  const processBudgetData = (budgets: any[]) => {
    // Group budgets by month and take the latest entry for each month
    const budgetMap: {[key: string]: number} = {}

    budgets.forEach((budget: any) => {
      const monthKey = budget.date.substring(0, 7) // YYYY-MM format
      if (!budgetMap[monthKey] || new Date(budget.timestamp) > new Date(budgets.find((b: any) => b.date.substring(0, 7) === monthKey)?.timestamp || 0)) {
        budgetMap[monthKey] = budget.amount
      }
    })

    setAllBudgets(budgetMap)
    setBudgetsLoaded(true)

    // Set current month's budget
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    setMonthlyBudget(budgetMap[currentMonthKey] || 0)
  }

  // Fetch all budgets and cache them (now uses data from aggregated API)
  const fetchAllBudgets = async () => {
    try {
      setBudgetLoading(true)
      // Since we now get budgets from the aggregated API call in fetchData(),
      // we need to check if we already have budget data
      // If not, we'll make a separate call (fallback for edge cases)
      const response = await fetch('/api/fetch-all-data')

      if (response.ok) {
        const data = await response.json()
        const budgets = data.budgets || []
        processBudgetData(budgets)
      } else {
        console.error('Failed to fetch budget data')
        setMonthlyBudget(0)
        setAllBudgets({})
        setBudgetsLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching budget data:', error)
      setMonthlyBudget(0)
      setAllBudgets({})
      setBudgetsLoaded(true)
    } finally {
      setBudgetLoading(false)
    }
  }

  // Get budget for a specific month (from cache)
  const getBudgetForMonth = (month: number, year: number) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    return allBudgets[monthKey] || 0
  }

  // Helper function to get month range
  const getMonthRange = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    return {
      firstDay: `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`,
      lastDay: `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    }
  }


  // Fetch user categories
  const fetchUserCategories = async () => {
    try {
      setCategoriesLoading(true)
      const response = await fetch('/api/user-categories')
      if (response.ok) {
        const data = await response.json()
        setExpenseCategories(data.expense_categories || [])
        setIncomeCategories(data.income_categories || [])
      } else {
        console.error('Failed to fetch categories')
        // Set default categories from schema
        const { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } = await import('@/schema/schema')
        setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES)
        setIncomeCategories(DEFAULT_INCOME_CATEGORIES)
      }
    } catch (error) {
      console.error('Error fetching user categories:', error)
      // Set default categories on error
      const { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } = await import('@/schema/schema')
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES)
      setIncomeCategories(DEFAULT_INCOME_CATEGORIES)
    } finally {
      setCategoriesLoading(false)
    }
  }

  // Fetch data from PostgreSQL database with caching
  const fetchData = async (forceRefresh = false) => {
    if (!session) {
      setLoading(false)
      return
    }

    try {
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const expensesCache = getCache(CACHE_KEY_EXPENSES)
        const incomesCache = getCache(CACHE_KEY_INCOMES)
        const budgetsCache = getCache(CACHE_KEY_BUDGETS)

        if (isCacheValid(expensesCache) && isCacheValid(incomesCache) && isCacheValid(budgetsCache)) {
          console.log('Using cached PostgreSQL data')
          const cachedExpenses = expensesCache!.data
          const cachedIncomes = incomesCache!.data
          const cachedBudgets = budgetsCache!.data
          setExpenses(cachedExpenses)
          setIncomes(cachedIncomes)
          
          // Process cached budget data
          if (cachedBudgets && cachedBudgets.length > 0) {
            processBudgetData(cachedBudgets)
          }
          // Set chart data directly from cache (with filtering) with better error handling
          const filterDataByMonthLocal = (data: any[]) => {
            return data.filter(item => {
              if (!item || !item.date) return false
              try {
                const itemDate = new Date(item.date)
                if (isNaN(itemDate.getTime())) return false
                return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
              } catch (error) {
                console.warn('Invalid date format in cached data processing:', item)
                return false
              }
            })
          }

          const filteredExpensesLocal = filterDataByMonthLocal(cachedExpenses)
          const filteredIncomesLocal = filterDataByMonthLocal(cachedIncomes)
          const dataToUse = chartMode === 'expense' ? filteredExpensesLocal : filteredIncomesLocal
          const categoryTotals: { [key: string]: number } = {}
          dataToUse.forEach(item => {
            if (item && item.category) {
              const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0')
              if (!isNaN(amount)) {
                categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
              }
            }
          })
          const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
          const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length]
          }))
          setChartData(newChartData.length > 0 ? newChartData : mockChartData)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setError(null)

      // Fetch all data (expenses, incomes, budgets) in a single API call
      const response = await fetch('/api/fetch-all-data')

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 401) {
          // Authentication error - user session might have expired
          setError({
            message: 'Authentication required',
            errorType: 'AUTHENTICATION_REQUIRED',
            error: 'Your session has expired. Please sign in again.'
          })
          return
        }
        throw errorData
      }

      const data = await response.json()
      const expenses = data.expenses || []
      const incomes = data.incomes || []
      const budgets = data.budgets || []

      // Cache the data including budgets
      setCache(CACHE_KEY_EXPENSES, expenses)
      setCache(CACHE_KEY_INCOMES, incomes)
      setCache(CACHE_KEY_BUDGETS, budgets)

      setExpenses(expenses)
      setIncomes(incomes)

      // Process budget data if available
      if (budgets.length > 0) {
        processBudgetData(budgets)
      }

      // Update chart data based on current mode (using filtered data) with better error handling
      const filterDataByMonthLocal = (data: any[]) => {
        return data.filter(item => {
          if (!item || !item.date) return false
          try {
            const itemDate = new Date(item.date)
            if (isNaN(itemDate.getTime())) return false
            return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
          } catch (error) {
            console.warn('Invalid date format in fresh data processing:', item)
            return false
          }
        })
      }

      const filteredExpensesLocal = filterDataByMonthLocal(expenses)
      const filteredIncomesLocal = filterDataByMonthLocal(incomes)
      const dataToUse = chartMode === 'expense' ? filteredExpensesLocal : filteredIncomesLocal
      const categoryTotals: { [key: string]: number } = {}
      dataToUse.forEach((item: any) => {
        if (item && item.category) {
          const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0')
          if (!isNaN(amount)) {
            categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
          }
        }
      })
      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
      const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      setChartData(newChartData.length > 0 ? newChartData : mockChartData)

    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle category switch from form
  const handleCategorySwitch = (category: 'income' | 'expense') => {
    setChartMode(category)
  }

  // Handle chart type switch
  const handleChartTypeSwitch = (type: 'donut' | 'line') => {
    setChartType(type)
  }

  // Clear error state
  const handleClearError = () => {
    setError(null)
  }

  // Initialize user data when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      // Fetch user categories and data
      fetchUserCategories().then(() => {
        // Load data (will use cache if valid, otherwise fetch fresh)
        fetchData()
      })
    } else if (status === 'unauthenticated') {
      setLoading(false)
      setCategoriesLoading(false)
    }
  }, [session, status])

  // Fetch all budgets when user is authenticated
  useEffect(() => {
    if (status === 'authenticated' && !loading && !budgetsLoaded) {
      fetchAllBudgets()
    }
  }, [status, loading, budgetsLoaded])

  // Update current month's budget when month changes (from cache)
  useEffect(() => {
    if (budgetsLoaded) {
      const budget = getBudgetForMonth(currentMonth, currentYear)
      setMonthlyBudget(budget)
    }
  }, [currentMonth, currentYear, budgetsLoaded, allBudgets])

  // Update chart data when mode or month changes with better error handling
  useEffect(() => {
    if (expenses.length > 0 || incomes.length > 0) {
      // Filter data by selected month with better error handling
      const filterDataByMonthLocal = (data: any[]) => {
        return data.filter(item => {
          if (!item || !item.date) return false
          try {
            const itemDate = new Date(item.date)
            if (isNaN(itemDate.getTime())) return false
            return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
          } catch (error) {
            console.warn('Invalid date format in chart processing:', item)
            return false
          }
        })
      }

      const filteredExpensesLocal = filterDataByMonthLocal(expenses)
      const filteredIncomesLocal = filterDataByMonthLocal(incomes)

      const dataToUse = chartMode === 'expense' ? filteredExpensesLocal : filteredIncomesLocal
      const categoryTotals: { [key: string]: number } = {}
      
      dataToUse.forEach((item: any) => {
        if (item && item.category) {
          const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0')
          if (!isNaN(amount)) {
            categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
          }
        }
      })
      
      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
      const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      setChartData(newChartData.length > 0 ? newChartData : mockChartData)
    }
  }, [chartMode, expenses, incomes, currentMonth, currentYear])


  // Handle form submission
  const handleFormSubmit = async (formData: {
    amount: number;
    category: string;
    date: string;
    note: string;
    type: 'expense' | 'income';
  }) => {
    try {
      setFormLoading(true)
      const endpoint = formData.type === 'expense' ? '/api/submit-expense' : '/api/submit-income'

      // Format timestamp in readable format: YYYY-MM-DD HH:MM:SS
      const now = new Date()
      const timestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0')

      const payload = {
        timestamp: timestamp,
        date: formData.date,
        amount: formData.amount,
        category: formData.category,
        ...(formData.type === 'expense'
          ? { notes: formData.note || '' }
          : { description: formData.note || '' }
        )
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Clear cache and refresh chart data to get latest state
        clearCache()

        // Refresh data to update chart
        try {
          const response = await fetch('/api/fetch-all-data')

          if (response.ok) {
            const data = await response.json()
            const newExpenses = data.expenses || []
            const newIncomes = data.incomes || []
            const newBudgets = data.budgets || []

            // Update chart data only
            // Update chart data after form submission (using filtered data) with better error handling
            const filterDataByMonthLocal = (data: any[]) => {
              return data.filter(item => {
                if (!item || !item.date) return false
                try {
                  const itemDate = new Date(item.date)
                  if (isNaN(itemDate.getTime())) return false
                  return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
                } catch (error) {
                  console.warn('Invalid date format in form submission processing:', item)
                  return false
                }
              })
            }

            const filteredNewExpenses = filterDataByMonthLocal(newExpenses)
            const filteredNewIncomes = filterDataByMonthLocal(newIncomes)
            const dataToUse = chartMode === 'expense' ? filteredNewExpenses : filteredNewIncomes
            const categoryTotals: { [key: string]: number } = {}
            dataToUse.forEach((item: any) => {
              if (item && item.category) {
                const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0')
                if (!isNaN(amount)) {
                  categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
                }
              }
            })
            const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
            const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
              name,
              value,
              color: colors[index % colors.length]
            }))
            setChartData(newChartData.length > 0 ? newChartData : mockChartData)
            // Update global state for balance calculation
            setExpenses(newExpenses)
            setIncomes(newIncomes)
            // Update budget data if available
            if (newBudgets.length > 0) {
              processBudgetData(newBudgets)
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing data after submission:', refreshError)
          // Still show success toast even if refresh fails
        }

        toast.success(`${formData.type === 'expense' ? 'Expense' : 'Income'} saved successfully!`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save data')
      }
    } catch (err: any) {
      console.error('Error saving data:', err)
      toast.error(`Error saving data: ${err.message}`)
      throw err // Re-throw to let form component handle it
    } finally {
      setFormLoading(false)
    }
  }

  // Show loading skeleton when authentication status is loading
  if (status === 'loading') {
    return <LoadingSkeleton />
  }

  // Show login screen only when explicitly unauthenticated
  if (status === 'unauthenticated') {
    return <LoginScreen />
  }

  return (
    <div className="w-full relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Full-width background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600"></div>

      {/* Centered content */}
      <div className="relative z-10 h-full w-full max-w-sm mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 w-full flex-shrink-0">
          <div className="relative">
            <Bell
              className="w-5 h-5 text-white cursor-pointer"
              onClick={() => {
                console.log('Bell clicked, balance:', balance, 'monthlyBudget:', monthlyBudget, 'totalExpenses:', totalExpenses, 'isNaN(balance):', isNaN(balance))
                if (balance < 0 && !isNaN(balance)) {
                  setIsBudgetAlertOpen(true)
                } else if (!isNaN(balance)) {
                  console.log('Showing toast message')
                  toast.success("No issue. Everything is fine! 👍")
                } else {
                  console.log('Balance is NaN, not showing anything')
                }
              }}
            />
            {balance < 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
            )}
          </div>
          <UserMenu />
        </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl p-4 w-full overflow-y-auto flex flex-col items-center">

        {/* Chart Section */}
        <Chart
            data={chartData}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            balance={balance}
            loading={loading}
            mode={chartMode}
            chartType={chartType}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onNavigateMonth={navigateMonth}
            onChartTypeSwitch={handleChartTypeSwitch}
            canNavigatePrev={false}
            canNavigateNext={false}
            getMonthName={getMonthName}
            expenses={expenses}
            incomes={incomes}
            monthlyBudget={monthlyBudget}
            budgetLoading={budgetLoading}
            budgetsLoaded={budgetsLoaded}
            onOpenBudgetDrawer={() => setIsBudgetDrawerOpen(true)}
          />

        {/* Form Section - Always show */}
        <ExpenseForm
          onSubmit={handleFormSubmit}
          loading={formLoading}
          onCategorySwitch={handleCategorySwitch}
        />
      </div>

      {/* Bottom Navigation */}
      <div className="flex gap-2 p-3 mb-1 bg-white w-full flex-shrink-0 rounded-b-lg">
        <Button
          variant="neutral"
          className="flex-1 h-8 text-xs border border-gray-300 shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 bg-transparent"
          onClick={() => setIsBudgetDrawerOpen(true)}
        >
          <Zap className="w-3 h-3 mr-1" />
          Anggaran
        </Button>
        <Drawer open={isDrawerOpen} onOpenChange={(open) => {
          setIsDrawerOpen(open)
          // Reset drawer key to remount Settings component
          if (!open) {
            setDrawerKey(prev => prev + 1)
          }
        }}>
          <DrawerTrigger asChild>
            <Button variant="neutral" className="flex-1 h-8 text-xs border border-gray-300 shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 bg-transparent">
              <SettingsIcon className="w-3 h-3 mr-1" />
              Settings
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh] w-full max-w-sm mx-auto flex flex-col">
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle>Settings</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <Settings
                key={drawerKey}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                userEmail={session?.user?.email || ''}
                loading={loading}
              />
            </div>
          </DrawerContent>
        </Drawer>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 text-center mb-1">
          <p className="text-xs text-white/70">Tim Peneliti DIPA Polinema</p>
        </div>

        {/* Budget Alert Dialog */}
        <Dialog open={isBudgetAlertOpen} onOpenChange={setIsBudgetAlertOpen}>
          <DialogContent className="max-w-[90vw] w-full mx-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-red-600 text-lg">
                <AlertTriangle className="w-5 h-5" />
                Budget Alert
              </DialogTitle>
              <DialogDescription className="text-sm space-y-2">
                <p className="text-gray-700">Your spending has exceeded your income by:</p>
                <p className="text-xl font-bold text-red-600">
                  Rp {Math.abs(balance).toLocaleString('id-ID')}
                </p>
                <p className="text-gray-600 text-sm">
                  Consider reviewing your expenses to get back on track.
                </p>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Budget Drawer */}
        <BudgetDrawer
          isOpen={isBudgetDrawerOpen}
          onClose={() => {
            setIsBudgetDrawerOpen(false)
            // Refresh all budget data when drawer closes
            setBudgetsLoaded(false)
            fetchAllBudgets()
          }}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />
      </div>
    </div>
  )
}
