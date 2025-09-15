'use client'

import { useState, useEffect } from 'react'
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { convertDatabaseCategoriesToForm, FormCategory } from '@/lib/icon-mapper'
import { cn } from "@/lib/utils"

// Indonesian month names
const indonesianMonths = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

// Format date in Indonesian format: "D MMM YYYY" (e.g., "7 Agu 2025")
function formatIndonesianDate(date: Date): string {
  const day = date.getDate()
  const month = indonesianMonths[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

interface ExpenseFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  loading: boolean;
}

interface FormData {
  amount: number;
  category: string;
  date: string;
  note: string;
  type: 'expense' | 'income';
}

export function ExpenseForm({ onSubmit, loading }: ExpenseFormProps) {
  const [activeCategory, setActiveCategory] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [date, setDate] = useState<Date>(new Date()) // Initialize with today's date
  const [note, setNote] = useState('')
  const [expenseCategories, setExpenseCategories] = useState<FormCategory[]>([])
  const [incomeCategories, setIncomeCategories] = useState<FormCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Fetch user categories
  const fetchUserCategories = async () => {
    try {
      const response = await fetch('/api/user-categories')
      if (response.ok) {
        const data = await response.json()
        const expenseCats = convertDatabaseCategoriesToForm(data.expense_categories || [])
        const incomeCats = convertDatabaseCategoriesToForm(data.income_categories || [])
        setExpenseCategories(expenseCats)
        setIncomeCategories(incomeCats)
      } else {
        console.error('Failed to fetch user categories')
      }
    } catch (error) {
      console.error('Error fetching user categories:', error)
    } finally {
      setCategoriesLoading(false)
    }
  }

  useEffect(() => {
    fetchUserCategories()
  }, [])

  const handleSave = async () => {
    if (categoriesLoading) {
      alert('Please wait for categories to load')
      return
    }

    // Validate required fields
    const missingFields = []
    if (!amount.trim()) missingFields.push('Amount')
    if (!selectedCategory) missingFields.push('Category')
    if (!date) missingFields.push('Date')

    if (missingFields.length > 0) {
      alert(`Please fill in the required fields: ${missingFields.join(', ')}`)
      return
    }

    const formData: FormData = {
      amount: parseFloat(amount),
      category: selectedCategory,
      date: format(date, 'yyyy-MM-dd'),
      note: note || '',
      type: activeCategory
    }

    try {
      await onSubmit(formData)
      
      // Reset form after successful submission
      setAmount('')
      setSelectedCategory('')
      setDate(new Date()) // Reset to today's date
      setNote('')
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error)
    }
  }

  return (
    <div className="space-y-4 w-full max-w-sm">
      {/* Category Buttons */}
      <div className="flex gap-2 w-full">
        <Button
          variant={activeCategory === 'expense' ? "default" : "neutral"}
          className="flex-1 h-8 text-xs"
          onClick={() => {
            setActiveCategory('expense')
            setSelectedCategory('') // Clear selected category when switching
            setDate(new Date()) // Set date to today when switching to expense
          }}
        >
          <TrendingDown className="w-3 h-3 mr-1" />
          Pengeluaran
        </Button>
        <Button
          variant={activeCategory === 'income' ? "default" : "neutral"}
          className="flex-1 h-8 text-xs"
          onClick={() => {
            setActiveCategory('income')
            setSelectedCategory('') // Clear selected category when switching
            setDate(new Date()) // Set date to today when switching to income
          }}
        >
          <TrendingUp className="w-3 h-3 mr-1" />
          Pemasukan
        </Button>
      </div>

      {/* Input Form */}
      <div className="space-y-4 w-full">
        {/* Amount Input */}
        <div className="w-full">
          <div className="relative w-full">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl text-secondary-foreground/50 font-medium">
              Rp
            </span>
            <input
              type="text"
              id="amount"
              placeholder="0"
              inputMode="numeric"
              required
              value={amount ? new Intl.NumberFormat('id-ID').format(Number(amount)) : ''}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\./g, '');
                if (/^\d*$/.test(numericValue)) {
                  setAmount(numericValue);
                }
              }}
              className="text-xl h-[3rem] leading-[3rem] font-medium border-0 border-b border-secondary-foreground/50 rounded-none focus:placeholder:opacity-0 focus:border-opacity-0 focus:outline-none focus:ring-0 px-0 placeholder:text-secondary-foreground/50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full pl-[3rem] bg-transparent"
            />
          </div>
        </div>

        {/* Category & Date Row */}
        <div className="flex gap-4 w-full">
          {/* Category Select */}
          <div className="flex-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={categoriesLoading}>
              <SelectTrigger className="flex items-center gap-2 w-full px-0 py-2 text-sm text-left bg-transparent border-0 border-b border-secondary-foreground/50 rounded-none focus:outline-none focus:ring-0 hover:bg-transparent focus:border-secondary-foreground disabled:opacity-50">
                <div className="flex items-center gap-2">
                  {selectedCategory ? (
                    (() => {
                      const category = (activeCategory === 'expense' ? expenseCategories : incomeCategories)
                        .find(cat => cat.value === selectedCategory);
                      return category ? (
                        <>
                          <category.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{category.label}</span>
                        </>
                      ) : null;
                    })()
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full border border-secondary-foreground/50 flex-shrink-0" />
                      <span className="text-secondary-foreground/50">
                        {categoriesLoading ? 'Loading...' : 'Kategori'}
                      </span>
                    </>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent className="w-full">
                {(activeCategory === 'expense' ? expenseCategories : incomeCategories).map((category) => (
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
          <div className="flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 w-full h-10 px-0 py-2 text-sm text-left bg-transparent border-0 border-b border-secondary-foreground/50 rounded-none focus:outline-none focus:ring-0 hover:bg-transparent focus:border-secondary-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                    <span className={cn("truncate", !date && "text-secondary-foreground/50")}>
                      {date ? formatIndonesianDate(date) : "Tanggal"}
                    </span>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(day) => day && setDate(day)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Note Input */}
        <div className="w-full">
          <textarea
            id="note"
            placeholder="Catatan..."
            className="resize-none px-0 border-0 border-b border-secondary-foreground/50 rounded-none focus:ring-0 focus-visible:ring-0 focus:outline-none placeholder:text-secondary-foreground/50 w-full align-bottom placeholder:bottom-1 placeholder:left-0 flex h-[2rem] focus:placeholder:opacity-0 max-h-none overflow-hidden bg-transparent"
            value={note}
            onChange={(e) => {
              e.target.style.height = '2rem';
              e.target.style.height = e.target.scrollHeight + 'px';
              setNote(e.target.value);
            }}
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full h-8 text-sm font-medium"
        >
          <Wallet className="w-3 h-3 mr-1" />
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
