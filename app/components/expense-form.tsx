'use client'

import { useState } from 'react'
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { categories, categoriesIncome } from '@/lib/selections'
import { cn } from "@/lib/utils"

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
  const [date, setDate] = useState<Date>()
  const [note, setNote] = useState('')

  const handleSave = async () => {
    if (!amount || !selectedCategory || !date) {
      alert('Please fill in all required fields')
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
      setDate(undefined)
      setNote('')
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error)
    }
  }

  return (
    <div className="space-y-4 w-full">
      {/* Category Buttons */}
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
    </div>
  )
}
