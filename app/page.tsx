'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Bell, Wallet, Settings, Zap, LogIn, Loader2, AlertTriangle } from 'lucide-react'
import { UserMenu } from './components/user-menu'
import { Chart } from './components/chart'
import { ExpenseForm } from './components/expense-form'
import { SheetSettings } from './components/sheet-settings'
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

// Types for our data
interface ExpenseData {
  timestamp: string;
  subject: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  reimbursed: string;
}

interface IncomeData {
  timestamp: string;
  subject: string;
  date: string;
  amount: number;
  category: string;
  description: string;
}

interface SheetError {
  message: string;
  errorType: string;
  error: string;
  serviceAccount?: string;
  sheetUrl?: string;
}

// Mock data for the donut chart (will be replaced with real data)
const mockChartData = [
  { name: 'Food', value: 400, color: '#0088FE' },
  { name: 'Transport', value: 300, color: '#00C49F' },
  { name: 'Entertainment', value: 200, color: '#FFBB28' },
  { name: 'Others', value: 100, color: '#FF8042' },
]

// Cache configuration
const CACHE_KEY_EXPENSES = 'expense_tracker_expenses'
const CACHE_KEY_INCOMES = 'expense_tracker_incomes'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

interface CacheData {
  data: any[]
  timestamp: number
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
      timestamp: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch {
    // Ignore cache write errors
  }
}

const isCacheValid = (cache: CacheData | null): boolean => {
  if (!cache) return false
  return (Date.now() - cache.timestamp) < CACHE_DURATION
}

const clearCache = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY_EXPENSES)
    localStorage.removeItem(CACHE_KEY_INCOMES)
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
  const [error, setError] = useState<SheetError | null>(null)
  const [chartData, setChartData] = useState(mockChartData)
  const [userSheetId, setUserSheetId] = useState<string | null>(null)
  const [hasUserSheet, setHasUserSheet] = useState<boolean>(false)

  // Categories state
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerKey, setDrawerKey] = useState(0)

  // Budget alert dialog state
  const [isBudgetAlertOpen, setIsBudgetAlertOpen] = useState(false)
  
  // Calculate balance from real data
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const balance = totalIncome - totalExpenses

  // Check user sheet configuration
  const checkUserSheet = async () => {
    try {
      const response = await fetch('/api/user-sheet')

      if (response.ok) {
        const data = await response.json()
        setHasUserSheet(data.hasSheet)
        if (data.hasSheet) {
          setUserSheetId(data.sheetId)
        }
      } else {
        setHasUserSheet(false)
        setUserSheetId(null)
      }
    } catch (error) {
      console.error('Error checking user sheet:', error)
      setHasUserSheet(false)
      setUserSheetId(null)
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

  // Fetch data from Google Sheets with caching
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

        if (isCacheValid(expensesCache) && isCacheValid(incomesCache)) {
          console.log('Using cached data')
          setExpenses(expensesCache!.data)
          setIncomes(incomesCache!.data)
          updateChartData(expensesCache!.data)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setError(null)

      // Fetch both expenses and incomes in parallel
      const [expensesResponse, incomesResponse] = await Promise.all([
        fetch('/api/fetch-expenses'),
        fetch('/api/fetch-income')
      ])

      // Handle expenses response
      if (!expensesResponse.ok) {
        const errorData = await expensesResponse.json()
        if (expensesResponse.status === 401) {
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

      // Handle incomes response
      if (!incomesResponse.ok) {
        const errorData = await incomesResponse.json()
        if (incomesResponse.status === 401) {
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

      const expensesData = await expensesResponse.json()
      const incomesData = await incomesResponse.json()

      const expenses = expensesData.expenses || []
      const incomes = incomesData.incomes || []

      // Cache the data
      setCache(CACHE_KEY_EXPENSES, expenses)
      setCache(CACHE_KEY_INCOMES, incomes)

      setExpenses(expenses)
      setIncomes(incomes)

      // Update chart data based on expense categories
      updateChartData(expenses)

    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // Update chart data based on expenses
  const updateChartData = (expensesData: ExpenseData[]) => {
    const categoryTotals: { [key: string]: number } = {}
    
    expensesData.forEach(expense => {
      if (expense.category && expense.amount) {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount
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

  // Handle sheet creation
  const handleCreateSheet = async () => {
    try {
      setLoading(true)
      console.log('Creating sheet for user:', session?.user?.email)
      console.log('Session has accessToken:', !!session?.accessToken)
      
      const response = await fetch('/api/setup-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      })

      const result = await response.json()
      console.log('Setup sheet response:', result)
      
      if (response.ok) {
        // Update user sheet status
        setHasUserSheet(true)
        setUserSheetId(result.sheetId)
        
        if (result.needsManualSharing) {
          // Sheet created but needs manual sharing
          setError({
            message: 'Sheet created - Manual sharing needed',
            errorType: 'SHEET_CREATED_NEEDS_SHARING',
            error: `Your sheet was created successfully, but you need to manually share it with the service account to start using it.`,
            serviceAccount: result.serviceAccount,
            sheetUrl: result.spreadsheetUrl
          })
        } else {
          // Everything worked perfectly
          clearCache() // Clear old cache since we have new sheet
          setError(null)
          alert(`🎉 Sheet created and configured successfully! Your personal expense tracker is ready.`)
          // Refresh data after successful creation
          await fetchData(true)
        }
      } else {
        throw result
      }
    } catch (err: any) {
      console.error('Error creating sheet:', err)
      alert(`Error creating sheet: ${err.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle existing sheet setup
  const handleSetupExistingSheet = async () => {
    const sheetId = prompt('Please enter your Google Sheets ID:')
    if (!sheetId) return

    try {
      setLoading(true)
      const response = await fetch('/api/setup-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup-existing', sheetId })
      })

      const result = await response.json()
      
      if (response.ok) {
        // Update user sheet status
        clearCache() // Clear old cache since we have new sheet
        setHasUserSheet(true)
        setUserSheetId(sheetId)
        setError(null)

        alert('🎉 Sheet setup successfully! Permissions automatically granted. Your personal expense tracker is ready.')
        // Refresh data after successful setup
        await fetchData(true)
      } else {
        throw result
      }
    } catch (err: any) {
      console.error('Error setting up sheet:', err)
      alert(`Error setting up sheet: ${err.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Clear error state
  const handleClearError = () => {
    if (error?.errorType === 'SHEET_MANAGEMENT') {
      setError(null)
    } else {
      setError({
        message: 'Sheet Management',
        errorType: 'SHEET_MANAGEMENT',
        error: 'Manage your Google Sheet connection'
      })
    }
  }

  // Initialize user data when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      // Fetch user categories and check sheet configuration
      fetchUserCategories().then(() => {
        checkUserSheet().then(() => {
          // Only fetch data if we have a sheet configured
          fetchData()
        })
      })
    } else if (status === 'unauthenticated') {
      setLoading(false)
      setCategoriesLoading(false)
    }
  }, [session, status])

  // Automatically open sheet settings if no sheet is configured
  useEffect(() => {
    if (status === 'authenticated' && !hasUserSheet && !loading) {
      setIsDrawerOpen(true)
    }
  }, [hasUserSheet, status, loading])

  // Handle form submission
  const handleFormSubmit = async (formData: {
    amount: number;
    category: string;
    date: string;
    note: string;
    type: 'expense' | 'income';
  }) => {
    try {
      setLoading(true)
      const endpoint = formData.type === 'expense' ? '/api/submit-expense' : '/api/submit-income'
      
      const payload = {
        timestamp: new Date().toISOString(),
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
        // Clear cache and refresh data to get latest state
        clearCache()
        await fetchData(true) // Force refresh to get updated data

        alert(`${formData.type === 'expense' ? 'Expense' : 'Income'} saved successfully!`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save data')
      }
    } catch (err: any) {
      console.error('Error saving data:', err)
      alert(`Error saving data: ${err.message}`)
      throw err // Re-throw to let form component handle it
    } finally {
      setLoading(false)
    }
  }


  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="w-full relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        {/* Full-width background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600"></div>

        {/* Centered content */}
        <div className="relative z-10 h-full w-full max-w-sm mx-auto flex flex-col items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin h-10 w-10 text-white mx-auto mb-3" />
            <p className="text-white text-base">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (status === 'unauthenticated' || !session) {
    return (
      <div className="w-full relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        {/* Full-width background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600"></div>

        {/* Centered content */}
        <div className="relative z-10 h-full w-full max-w-sm mx-auto flex flex-col">
          {/* Header Space */}
          <div className="p-3 w-full flex-shrink-0"></div>

          {/* Login Content */}
          <div className="flex-1 bg-white rounded-t-3xl p-4 flex flex-col items-center justify-center space-y-4 overflow-y-auto">
          <div className="text-center space-y-3 max-w-md">
            <Wallet className="w-12 h-12 text-blue-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">
              Welcome to Finance Tracker
            </h1>
            {/* <p className="text-gray-600 text-sm">
              Please sign in with your Google account to access your personal expense data and connect to your Google Sheets.
            </p> */}
          </div>

          <div className="space-y-3 w-full max-w-sm flex flex-col items-center space-y-4">
            <Button
              onClick={() => signIn('google')}
              className="w-80 h-10 text-base font-medium"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>

            <div className="text-center text-xs text-gray-500 max-w-xs">
              <p>
                Your Google account will be used to create & access your Google Sheets for your financial data.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-2 flex-shrink-0"></div>
      </div>
    </div>
    )
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
                if (balance < 0) {
                  setIsBudgetAlertOpen(true)
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
      <div className="flex-1 bg-white rounded-t-3xl mt-2 p-4 space-y-6 w-full overflow-y-auto flex flex-col items-center">

        {/* Chart Section */}
        {!error && (
          <Chart
            data={chartData}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            balance={balance}
            loading={loading}
          />
        )}

        {/* Form Section - Only show when data is loaded and no error */}
        {!loading && !error && (
          <ExpenseForm
            onSubmit={handleFormSubmit}
            loading={loading}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex gap-2 p-3 mb-2 bg-white w-full flex-shrink-0">
        <Button variant="neutral" className="flex-1 h-8 text-xs border border-gray-300 shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 bg-transparent">
          <Zap className="w-3 h-3 mr-1" />
          Anggaran
        </Button>
        <Drawer open={isDrawerOpen} onOpenChange={(open) => {
          setIsDrawerOpen(open)
          // Clear SHEET_MANAGEMENT error when drawer closes
          if (!open && error?.errorType === 'SHEET_MANAGEMENT') {
            setError(null)
          }
          // Reset drawer key to remount SheetSettings component and clear management state
          if (!open) {
            setDrawerKey(prev => prev + 1)
          }
        }}>
          <DrawerTrigger asChild>
            <Button variant="neutral" className="flex-1 h-8 text-xs border border-gray-300 shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 bg-transparent">
              <Settings className="w-3 h-3 mr-1" />
              Settings
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh] w-full flex flex-col">
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle>Settings</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <SheetSettings
                key={drawerKey}
                error={error}
                userSheetId={userSheetId}
                hasUserSheet={hasUserSheet}
                userEmail={session?.user?.email || ''}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                onCreateSheet={handleCreateSheet}
                onSetupExistingSheet={handleSetupExistingSheet}
                onRetryFetch={fetchData}
                onClearError={handleClearError}
                loading={loading}
              />
            </div>
          </DrawerContent>
        </Drawer>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0"></div>

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
      </div>
    </div>
  )
}
