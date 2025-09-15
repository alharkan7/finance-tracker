'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Bell, Wallet, Settings, TrendingUp, Zap, TrendingDown } from 'lucide-react'
import { UserMenu } from './components/user-menu'
import { categories, categoriesIncome } from '@/lib/selections'
import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

// Mock data for the donut chart
const mockChartData = [
  { name: 'Food', value: 400, color: '#0088FE' },
  { name: 'Transport', value: 300, color: '#00C49F' },
  { name: 'Entertainment', value: 200, color: '#FFBB28' },
  { name: 'Others', value: 100, color: '#FF8042' },
]

export default function MobileFinanceTracker() {
  const [activeCategory, setActiveCategory] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [date, setDate] = useState<Date>()
  const [note, setNote] = useState('')
  
  const balance = 1000000 // Mock balance in Rupiah

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-8 w-full">
        <Bell className="w-6 h-6 text-white" />
        <UserMenu />
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl mt-4 p-4 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full">
        
        {/* Balance Section */}
        <div className="text-center space-y-4 w-full">
          <div>
            <p className="text-gray-600 text-sm">Saldo saat ini</p>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
              Rp {balance.toLocaleString('id-ID')}
            </h1>
          </div>
          
          {/* Donut Chart */}
          <div className="h-40 w-40 sm:h-48 sm:w-48 mx-auto max-w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                >
                  {mockChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

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
          <Button className="w-full h-10 sm:h-12 text-base sm:text-lg font-medium">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Save
          </Button>
        </div>
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
