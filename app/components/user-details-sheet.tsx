'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Calendar, RefreshCw, TrendingUp, TrendingDown, Filter } from 'lucide-react'
import DatePicker from "@/components/ui/date-picker"
import { toast } from 'sonner'
import { format } from 'date-fns'

interface UserDetails {
  user: {
    id: number
    email: string
    avatar?: string
    created_at: string
    last_login?: string
  }
  expenses: any[]
  incomes: any[]
  expenseByCategory: { [key: string]: number }
  incomeByCategory: { [key: string]: number }
  summary: {
    totalExpenses: number
    totalIncomes: number
    balance: number
    expenseCount: number
    incomeCount: number
  }
}

interface UserDetailsSheetProps {
  selectedUser: UserDetails | null
  sheetOpen: boolean
  onOpenChange: (open: boolean) => void
  userId: number | null
}

export function UserDetailsSheet({
  selectedUser,
  sheetOpen,
  onOpenChange,
  userId
}: UserDetailsSheetProps) {
  const [loading, setLoading] = useState(false)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)

  // Filter state for the sheet
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [filterApplied, setFilterApplied] = useState(false)

  // Fetch user details
  const fetchUserDetails = async (applyFilter = false) => {
    if (!userId) return

    try {
      setLoading(true)
      let url = `/api/admin/user-details?userId=${userId}`

      if (applyFilter && (startDate || endDate)) {
        const params = new URLSearchParams()
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        url += `&${params.toString()}`
        setFilterApplied(true)
      } else {
        setFilterApplied(false)
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch user details')
      }

      const data = await response.json()
      setUserDetails(data)
    } catch (error: any) {
      console.error('Error fetching user details:', error)
      toast.error('Failed to fetch user details')
    } finally {
      setLoading(false)
    }
  }

  // Load data when sheet opens
  useEffect(() => {
    if (sheetOpen && userId && !userDetails) {
      fetchUserDetails()
    }
  }, [sheetOpen, userId])

  // Reset data when sheet closes
  useEffect(() => {
    if (!sheetOpen) {
      setUserDetails(null)
      setStartDate('')
      setEndDate('')
      setFilterApplied(false)
    }
  }, [sheetOpen])

  // Handle filter application
  const handleApplyFilters = () => {
    fetchUserDetails(true)
  }

  // Handle filter clearing
  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setFilterApplied(false)
    fetchUserDetails(false)
  }

  const displayData = userDetails || selectedUser

  return (
    <Sheet open={sheetOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : displayData ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {displayData.user.avatar ? (
                  <img
                    src={displayData.user.avatar}
                    alt={displayData.user.email}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {displayData.user.email.charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{displayData.user.email}</span>
              </SheetTitle>
              {/* <SheetDescription>
                Detailed financial records and category breakdown
              </SheetDescription> */}
            </SheetHeader>

            {/* Date Range Filters */}
            <div className="mt-6 w-full bg-muted/30 rounded-lg p-4">
              {/* <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filter Transactions</span>
              </div> */}
              <div className="flex w-full gap-2 items-end">
                <div className="flex flex-col gap-1 flex-1">
                  <Label htmlFor="sheet-start-date" className="text-xs text-muted-foreground text-center">Start Date</Label>
                  <DatePicker
                    date={startDate}
                    setDate={(date) => setStartDate(date ? date.split('T')[0] : '')}
                    triggerClassName="w-full h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <Label htmlFor="sheet-end-date" className="text-xs text-muted-foreground text-center">End Date</Label>
                  <DatePicker
                    date={endDate}
                    setDate={(date) => setEndDate(date ? date.split('T')[0] : '')}
                    triggerClassName="w-full h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApplyFilters} size="sm">
                    Apply
                  </Button>
                  {filterApplied && (
                    <Button onClick={handleClearFilters} variant="outline" size="sm">
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <TrendingDown className="w-5 h-5" />
                      <span className="text-sm font-medium">Total Expenses</span>
                    </div>
                    <p className="text-2xl font-bold">
                      Rp {displayData.summary.totalExpenses.toLocaleString('id-ID')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {displayData.summary.expenseCount} records
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-sm font-medium">Total Income</span>
                    </div>
                    <p className="text-2xl font-bold">
                      Rp {displayData.summary.totalIncomes.toLocaleString('id-ID')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {displayData.summary.incomeCount} records
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Balance */}
              <Card className={displayData.summary.balance >= 0 ? 'border-green-200' : 'border-red-200'}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Net Balance</p>
                    <p className={`text-3xl font-bold ${
                      displayData.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Rp {displayData.summary.balance.toLocaleString('id-ID')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses by Category */}
              {Object.keys(displayData.expenseByCategory).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Expenses by Category</h3>
                  <div className="space-y-2">
                    {Object.entries(displayData.expenseByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="font-medium">{category}</span>
                          <span className="text-red-600 font-semibold">
                            Rp {amount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Incomes by Category */}
              {Object.keys(displayData.incomeByCategory).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Income by Category</h3>
                  <div className="space-y-2">
                    {Object.entries(displayData.incomeByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="font-medium">{category}</span>
                          <span className="text-green-600 font-semibold">
                            Rp {amount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* All Transactions */}
              <div>
                <h3 className="text-lg font-semibold mb-3">All Transactions</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {[...displayData.expenses, ...displayData.incomes]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((transaction, index) => {
                      const isExpense = 'description' in transaction && displayData.expenses.includes(transaction)
                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-card border rounded-lg">
                          <div>
                            <p className="font-medium">{transaction.category}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </p>
                            {transaction.description && (
                              <p className="text-xs text-muted-foreground">{transaction.description}</p>
                            )}
                          </div>
                          <span className={`font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                            {isExpense ? '-' : '+'}Rp {parseFloat(transaction.amount).toLocaleString('id-ID')}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No user selected</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
