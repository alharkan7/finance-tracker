'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Bell, Wallet, Settings, TrendingUp, Zap, TrendingDown, AlertCircle, Plus, Share, LogIn, Copy, ExternalLink, CheckCircle } from 'lucide-react'
import { UserMenu } from './components/user-menu'
import { categories, categoriesIncome } from '@/lib/selections'
import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

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

export default function MobileFinanceTracker() {
  const { data: session, status } = useSession()
  const [activeCategory, setActiveCategory] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [date, setDate] = useState<Date>()
  const [note, setNote] = useState('')
  
  // Data state
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [incomes, setIncomes] = useState<IncomeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<SheetError | null>(null)
  const [chartData, setChartData] = useState(mockChartData)
  const [userSheetId, setUserSheetId] = useState<string | null>(null)
  const [hasUserSheet, setHasUserSheet] = useState<boolean>(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  
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

  // Fetch data from Google Sheets
  const fetchData = async () => {
    if (!session) {
      setLoading(false)
      return
    }

    try {
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

      setExpenses(expensesData.expenses || [])
      setIncomes(incomesData.incomes || [])

      // Update chart data based on expense categories
      updateChartData(expensesData.expenses || [])

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
          setError(null)
          alert(`🎉 Sheet created and configured successfully! Your personal expense tracker is ready.`)
          // Refresh data after successful creation
          await fetchData()
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
        setHasUserSheet(true)
        setUserSheetId(sheetId)
        setError(null)
        
        alert('🎉 Sheet setup successfully! Permissions automatically granted. Your personal expense tracker is ready.')
        // Refresh data after successful setup
        await fetchData()
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

  // Copy service account email to clipboard
  const copyServiceAccountEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = email
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  // Initialize user data when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      // First check if user has a sheet configured
      checkUserSheet().then(() => {
        // Only fetch data if we have a sheet configured
        fetchData()
      })
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [session, status])

  // Handle form submission
  const handleSave = async () => {
    if (!amount || !selectedCategory || !date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      const endpoint = activeCategory === 'expense' ? '/api/submit-expense' : '/api/submit-income'
      
      const payload = {
        timestamp: new Date().toISOString(),
        subject: '', // Empty subject as it's not used in the form
        date: format(date, 'yyyy-MM-dd'),
        amount: parseFloat(amount),
        category: selectedCategory,
        description: note || '',
        ...(activeCategory === 'expense' && { reimbursed: 'FALSE' })
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Reset form
        setAmount('')
        setSelectedCategory('')
        setDate(undefined)
        setNote('')
        
        // Refresh data
        await fetchData()
        
        alert(`${activeCategory === 'expense' ? 'Expense' : 'Income'} saved successfully!`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save data')
      }
    } catch (err: any) {
      console.error('Error saving data:', err)
      alert(`Error saving data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Render error state
  const renderError = () => {
    if (!error) return null

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800 mb-2">{error.message}</h3>
            <p className="text-sm text-red-600 mb-3">{error.error}</p>
            
            {error.errorType === 'SHEET_NOT_CONFIGURED' && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    ✨ <strong>Quick Setup:</strong> We'll automatically create your sheet and grant the necessary permissions!
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Note: If you signed in before, you may need to refresh permissions for automatic setup.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button onClick={handleCreateSheet} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Sheet
                  </Button>
                  <Button onClick={handleSetupExistingSheet} variant="neutral" className="w-full" size="sm">
                    <Share className="w-4 h-4 mr-2" />
                    Use Existing Sheet
                  </Button>
                  <Button 
                    onClick={() => signIn('google')} 
                    variant="neutral" 
                    className="w-full" 
                    size="sm"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Refresh Permissions
                  </Button>
                </div>
              </div>
            )}
            
            {error.errorType === 'SHEET_NOT_FOUND' && (
              <div className="space-y-2">
                <Button onClick={handleCreateSheet} className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Sheet
                </Button>
                <Button onClick={handleSetupExistingSheet} variant="neutral" className="w-full" size="sm">
                  <Share className="w-4 h-4 mr-2" />
                  Try Different Sheet
                </Button>
              </div>
            )}
            
            {error.errorType === 'ACCESS_DENIED' && (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">🔐 Sheet Access Required</h4>
                  <p className="text-sm text-orange-700 mb-3">
                    The service account needs access to your Google Sheet. Please grant access:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Copy Service Account Email</p>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <code className="text-xs flex-1 text-gray-800 break-all">
                          {error.serviceAccount}
                        </code>
                        <Button
                          size="sm"
                          variant="neutral"
                          onClick={() => copyServiceAccountEmail(error.serviceAccount!)}
                          className="flex-shrink-0"
                        >
                          {copiedEmail ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Grant Access to Your Sheet</p>
                      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Open your Google Sheet</li>
                        <li>Click "Share" button</li>
                        <li>Paste the service account email (copied above)</li>
                        <li>Set permission to "Editor"</li>
                        <li>Click "Send" (no notification needed)</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button onClick={fetchData} className="w-full" size="sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    I've Granted Access - Retry
                  </Button>
                  <Button onClick={handleSetupExistingSheet} variant="neutral" className="w-full" size="sm">
                    <Share className="w-4 h-4 mr-2" />
                    Try Different Sheet
                  </Button>
                </div>
              </div>
            )}
            
            {error.errorType === 'SHEET_TAB_NOT_FOUND' && (
              <div className="space-y-2">
                <Button onClick={handleSetupExistingSheet} className="w-full" size="sm">
                  Setup Sheet Structure
                </Button>
              </div>
            )}
            
            {error.errorType === 'AUTHENTICATION_REQUIRED' && (
              <div className="space-y-2">
                <Button onClick={() => signIn('google')} className="w-full" size="sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In Again
                </Button>
              </div>
            )}

            {error.errorType === 'MISSING_ACCESS_TOKEN' && (
              <div className="space-y-2">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-700">
                    🔄 Need to refresh permissions for Google Sheets access.
                  </p>
                </div>
                <Button onClick={() => signIn('google')} className="w-full" size="sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Refresh Permissions
                </Button>
              </div>
            )}

            {error.errorType === 'SHEET_CREATED_NEEDS_SHARING' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">✅ Sheet Created Successfully!</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Your Google Sheet was created, but we need to manually share it with our service account to access your data.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Step 1: Open Your New Sheet</p>
                      <Button
                        onClick={() => window.open(error.sheetUrl, '_blank')}
                        variant="neutral"
                        size="sm"
                        className="w-full text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Open Your Sheet
                      </Button>
                    </div>

                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Step 2: Copy Service Account Email</p>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <code className="text-xs flex-1 text-gray-800 break-all">
                          {error.serviceAccount}
                        </code>
                        <Button
                          size="sm"
                          variant="neutral"
                          onClick={() => copyServiceAccountEmail(error.serviceAccount!)}
                          className="flex-shrink-0"
                        >
                          {copiedEmail ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Step 3: Share Your Sheet</p>
                      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                        <li>In your sheet, click the "Share" button</li>
                        <li>Paste the service account email</li>
                        <li>Set permission to "Editor"</li>
                        <li>Click "Send"</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button onClick={fetchData} className="w-full" size="sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    I've Shared the Sheet - Start Tracking!
                  </Button>
                  <Button onClick={() => setError(null)} variant="neutral" className="w-full" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {error.errorType === 'SERVICE_ACCOUNT_ACCESS_REQUIRED' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">🔑 Service Account Access Required</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Don't worry! We try to automatically grant permissions, but if that fails, you can manually grant access following these steps:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Step 1: Copy Service Account Email</p>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <code className="text-xs flex-1 text-gray-800 break-all">
                          {error.serviceAccount}
                        </code>
                        <Button
                          size="sm"
                          variant="neutral"
                          onClick={() => copyServiceAccountEmail(error.serviceAccount!)}
                          className="flex-shrink-0"
                        >
                          {copiedEmail ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Step 2: Create or Open Your Google Sheet</p>
                      <div className="space-y-2">
                        <Button
                          onClick={() => window.open('https://sheets.google.com', '_blank')}
                          variant="neutral"
                          size="sm"
                          className="w-full text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Open Google Sheets
                        </Button>
                      </div>
                    </div>

                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Step 3: Share Sheet with Service Account</p>
                      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Click "Share" button in your Google Sheet</li>
                        <li>Paste the service account email (copied above)</li>
                        <li>Set permission to "Editor"</li>
                        <li>Click "Send" (no notification needed)</li>
                      </ol>
                    </div>

                    <div className="bg-white rounded p-3 border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Step 4: Get Your Sheet ID</p>
                      <p className="text-xs text-gray-600">
                        Copy the Sheet ID from your Google Sheet URL:<br/>
                        <code className="bg-gray-100 px-1 rounded">docs.google.com/spreadsheets/d/<span className="font-bold text-blue-600">[SHEET_ID]</span>/edit</code>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button onClick={handleCreateSheet} className="w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Try Automatic Setup
                  </Button>
                  <Button onClick={handleSetupExistingSheet} variant="neutral" className="w-full" size="sm">
                    <Share className="w-4 h-4 mr-2" />
                    Manual Setup (I've Granted Access)
                  </Button>
                  <Button onClick={() => setError(null)} variant="neutral" className="w-full" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {error.errorType === 'SHEET_MANAGEMENT' && (
              <div className="space-y-2">
                <Button onClick={handleCreateSheet} className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Sheet
                </Button>
                <Button onClick={handleSetupExistingSheet} variant="neutral" className="w-full" size="sm">
                  <Share className="w-4 h-4 mr-2" />
                  Connect Different Sheet
                </Button>
                {userSheetId && (
                  <Button 
                    onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${userSheetId}`, '_blank')}
                    variant="neutral" 
                    className="w-full" 
                    size="sm"
                  >
                    Open Current Sheet
                  </Button>
                )}
                <Button onClick={() => setError(null)} variant="neutral" className="w-full" size="sm">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (status === 'unauthenticated' || !session) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-8 w-full">
          <Bell className="w-6 h-6 text-white" />
          <UserMenu />
        </div>

        {/* Login Content */}
        <div className="flex-1 bg-white rounded-t-3xl mt-4 p-6 flex flex-col items-center justify-center space-y-6">
          <div className="text-center space-y-4 max-w-md">
            <Wallet className="w-16 h-16 text-blue-600 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to Expense Tracker
            </h1>
            <p className="text-gray-600">
              Please sign in with your Google account to access your personal expense data and connect to your Google Sheets.
            </p>
          </div>
          
          <div className="space-y-4 w-full max-w-sm">
            <Button 
              onClick={() => signIn('google')}
              className="w-full h-12 text-lg font-medium"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sign in with Google
            </Button>
            
            <div className="text-center text-sm text-gray-500">
              <p>
                Your Google account will be used to access your personal Google Sheets for storing expense and income data.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-blue-600 h-2"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-8 w-full">
        <Bell className="w-6 h-6 text-white" />
        <UserMenu />
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl mt-4 p-4 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full">
        
        {/* Error Display */}
        {renderError()}
        
        {/* Loading State */}
        {loading && !error && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading data...</p>
          </div>
        )}
        
        {/* User Sheet Info */}
        {!loading && !error && hasUserSheet && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Connected to your personal Google Sheet
                </span>
              </div>
              <Button 
                variant="neutral" 
                size="sm" 
                onClick={() => setError({
                  message: 'Sheet Management',
                  errorType: 'SHEET_MANAGEMENT',
                  error: 'Manage your Google Sheet connection'
                })}
                className="text-xs"
              >
                Manage
              </Button>
            </div>
            {userSheetId && (
              <p className="text-xs text-blue-600 mt-1 font-mono">
                ID: {userSheetId.substring(0, 20)}...
              </p>
            )}
          </div>
        )}

        {/* Balance Section */}
        {!loading && !error && (
          <div className="text-center space-y-4 w-full">
            <div>
              <p className="text-gray-600 text-sm">Saldo saat ini</p>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                Rp {balance.toLocaleString('id-ID')}
              </h1>
              <div className="flex justify-center gap-4 mt-2 text-xs">
                <span className="text-green-600">Income: Rp {totalIncome.toLocaleString('id-ID')}</span>
                <span className="text-red-600">Expenses: Rp {totalExpenses.toLocaleString('id-ID')}</span>
              </div>
            </div>
            
            {/* Donut Chart */}
            <div className="h-40 w-40 sm:h-48 sm:w-48 mx-auto max-w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Chart Legend */}
            {chartData.length > 0 && chartData !== mockChartData && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {chartData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="truncate">{entry.name}: Rp {entry.value.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Buttons - Only show when data is loaded and no error */}
        {!loading && !error && (
          <>
            <div className="flex gap-2 sm:gap-3 w-full">
              <Button
                variant={activeCategory === 'expense' ? "default" : "neutral"}
                className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
                onClick={() => setActiveCategory('expense')}
              >
                <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Pengeluaran
              </Button>
              <Button
                variant={activeCategory === 'income' ? "default" : "neutral"}
                className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
                onClick={() => setActiveCategory('income')}
              >
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Pemasukan
              </Button>
            </div>

            {/* Input Form */}
            <div className="space-y-3 sm:space-y-4 w-full">
          {/* Amount Input */}
          <div className="w-full">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Nominal
            </Label>
            <div className="mt-1 relative w-full">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm sm:text-base">
                Rp
              </span>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 h-10 sm:h-12 text-base sm:text-lg w-full"
              />
            </div>
          </div>

          {/* Category Select */}
          <div className="w-full">
            <Label htmlFor="category" className="text-sm font-medium text-gray-700">
              Kategori
            </Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="mt-1 h-10 sm:h-12 w-full">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent className="w-full">
                {(activeCategory === 'expense' ? categories : categoriesIncome).map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <category.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{category.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Picker */}
          <div className="w-full">
            <Label className="text-sm font-medium text-gray-700">
              Tanggal
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="neutral"
                  className={cn(
                    "w-full mt-1 h-10 sm:h-12 justify-start text-left font-normal text-sm sm:text-base",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {date ? format(date, "PPP") : "Pilih tanggal"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Note Input */}
          <div className="w-full">
            <Label htmlFor="note" className="text-sm font-medium text-gray-700">
              Catatan
            </Label>
            <Textarea
              id="note"
              placeholder="Tambahkan catatan..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 min-h-[60px] sm:min-h-[80px] w-full resize-none"
            />
          </div>

              {/* Save Button */}
              <Button 
                onClick={handleSave}
                disabled={loading}
                className="w-full h-10 sm:h-12 text-base sm:text-lg font-medium"
              >
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex gap-2 sm:gap-4 p-3 sm:p-4 bg-white w-full">
        <Button variant="neutral" className="flex-1 h-10 sm:h-12 text-sm sm:text-base">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          Anggaran
        </Button>
        <Button variant="neutral" className="flex-1 h-10 sm:h-12 text-sm sm:text-base">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          Setting
        </Button>
      </div>

      {/* Footer */}
      <div className="bg-blue-600 h-2"></div>
    </div>
  )
}
