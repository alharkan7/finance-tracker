'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Lock, Eye, EyeOff } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar, RefreshCw, User, FileText, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import DatePicker from "@/components/ui/date-picker"
import { toast } from 'sonner'
import { LoginScreen } from '../components/login-screen'
import { LoadingSkeleton } from '../components/loading-skeleton'
import { UserDetailsSheet } from '../components/user-details-sheet'
import { format } from 'date-fns'

interface UserStat {
  id: number
  email: string
  avatar?: string
  created_at: string
  last_login?: string
  total_records: number
  total_days: number
  expense_count: number
  income_count: number
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()

  // Password protection state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Data state
  const [users, setUsers] = useState<UserStat[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [failedAvatars, setFailedAvatars] = useState<Set<number>>(new Set())

  // Filter state
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [filterApplied, setFilterApplied] = useState(false)

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Password protection functions
  const checkPassword = () => {
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD // fallback password for development
    if (password === adminPassword) {
      setIsAuthenticated(true)
      setPasswordError('')
    } else {
      setPasswordError('Incorrect password')
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    checkPassword()
  }

  // Fetch user statistics
  const fetchUserStats = async (applyFilter = false) => {
    try {
      setLoading(true)
      let url = '/api/admin/user-stats'
      
      if (applyFilter && (startDate || endDate)) {
        const params = new URLSearchParams()
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        url += `?${params.toString()}`
        setFilterApplied(true)
      } else {
        setFilterApplied(false)
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch user statistics')
      }

      const data = await response.json()
      setUsers(data.users)
      setFailedAvatars(new Set()) // Reset failed avatars when new data is loaded
    } catch (error: any) {
      console.error('Error fetching user stats:', error)
      toast.error('Failed to fetch user statistics')
    } finally {
      setLoading(false)
    }
  }

  // Handle user selection
  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId)
    setSheetOpen(true)
  }

  // Handle row click
  const handleRowClick = (user: UserStat) => {
    handleUserSelect(user.id)
  }

  // Handle avatar image error
  const handleAvatarError = (userId: number) => {
    setFailedAvatars(prev => new Set(prev).add(userId))
  }

  // Apply filters
  const handleApplyFilters = () => {
    fetchUserStats(true)
  }

  // Clear filters
  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setFilterApplied(false)
    fetchUserStats(false)
  }

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort users based on current sort column and direction
  const sortedUsers = [...users]
    .filter(user => user.email !== 'raihankalla@gmail.com')
    .sort((a, b) => {
    if (!sortColumn) return 0

    let aValue: any, bValue: any

    switch (sortColumn) {
      case 'email':
        aValue = a.email.toLowerCase()
        bValue = b.email.toLowerCase()
        break
      case 'total_records':
        aValue = a.total_records
        bValue = b.total_records
        break
      case 'total_days':
        aValue = a.total_days
        bValue = b.total_days
        break
      case 'expenses':
        aValue = a.expense_count
        bValue = b.expense_count
        break
      case 'incomes':
        aValue = a.income_count
        bValue = b.income_count
        break
      case 'last_login':
        // For sorting, treat null last_login as created_at
        aValue = a.last_login ? new Date(a.last_login).getTime() : new Date(a.created_at).getTime()
        bValue = b.last_login ? new Date(b.last_login).getTime() : new Date(b.created_at).getTime()
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Reset selected user when sheet closes
  useEffect(() => {
    if (!sheetOpen) {
      setSelectedUserId(null)
    }
  }, [sheetOpen])


  // Initial load
  useEffect(() => {
    if (status === 'authenticated' && isAuthenticated) {
      fetchUserStats()
    }
  }, [status, isAuthenticated])

  // Show loading screen when authentication status is loading
  if (status === 'loading') {
    return <LoadingSkeleton />
  }

  // Show login screen when not authenticated
  if (status === 'unauthenticated') {
    return <LoginScreen onDemoClick={() => {}} />
  }

  // Show password form when not authenticated for admin access
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Admin Access Required</CardTitle>
            {/* <CardDescription>
              Enter the admin password to access the dashboard
            </CardDescription> */}
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                {/* <Label htmlFor="password">Password</Label> */}
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className={passwordError ? "border-red-500 rounded-md" : "rounded-md"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-semibold tracking-tight text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor user activity and usage statistics</p>
        </div>

        {/* User Table */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>User Statistics</CardTitle>
                <CardDescription>
                  Click on any row to view detailed records
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="start-date" className="text-xs text-muted-foreground text-center">Start Date</Label>
                    <DatePicker
                      date={startDate}
                      setDate={(date) => setStartDate(date ? date.split('T')[0] : '')}
                      triggerClassName="w-[140px] h-9 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="end-date" className="text-xs text-muted-foreground text-center">End Date</Label>
                    <DatePicker
                      date={endDate}
                      setDate={(date) => setEndDate(date ? date.split('T')[0] : '')}
                      triggerClassName="w-[140px] h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApplyFilters} size="sm">
                    Filter
                  </Button>
                  {filterApplied && (
                    <Button onClick={handleClearFilters} variant="outline" size="sm">
                      Clear
                    </Button>
                  )}
                  <Button
                    onClick={() => fetchUserStats(filterApplied)}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading user statistics...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center gap-2">
                          Email
                          {sortColumn === 'email' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-center cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('total_records')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Total Records
                          {sortColumn === 'total_records' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-center cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('total_days')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Total Days
                          {sortColumn === 'total_days' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-center cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('expenses')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Expenses
                          {sortColumn === 'expenses' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-center cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('incomes')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Incomes
                          {sortColumn === 'incomes' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('last_login')}
                      >
                        <div className="flex items-center gap-2">
                          Last Login
                          {sortColumn === 'last_login' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        onClick={() => handleRowClick(user)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.avatar && !failedAvatars.has(user.id) ? (
                              <img
                                src={user.avatar}
                                alt={user.email}
                                className="w-8 h-8 rounded-full"
                                onError={() => handleAvatarError(user.id)}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                                {user.email.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="blue" className="gap-1">
                            <FileText className="w-3 h-3" />
                            {user.total_records}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="green" className="gap-1">
                            <Calendar className="w-3 h-3" />
                            {user.total_days}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="red">
                            {user.expense_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="green">
                            {user.income_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.last_login
                            ? format(new Date(user.last_login), 'MMM d, yyyy')
                            : format(new Date(user.created_at), 'MMM d, yyyy')
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Details Sheet */}
        <UserDetailsSheet
          selectedUser={null}
          sheetOpen={sheetOpen}
          onOpenChange={setSheetOpen}
          userId={selectedUserId}
        />
      </div>
    </div>
  )
}

