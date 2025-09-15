'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Plus, Minus, Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface ChartProps {
  data: ChartData[];
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  loading: boolean;
  mode?: 'income' | 'expense';
  currentMonth: number;
  currentYear: number;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  getMonthName: (month: number) => string;
  expenses: any[];
  incomes: any[];
  monthlyBudget: number;
  budgetLoading: boolean;
  budgetsLoaded: boolean;
  onOpenBudgetDrawer: () => void;
}

export function Chart({
  data,
  totalIncome,
  totalExpenses,
  balance,
  loading,
  mode = 'expense',
  currentMonth,
  currentYear,
  onNavigateMonth,
  canNavigatePrev: propCanNavigatePrev,
  canNavigateNext: propCanNavigateNext,
  getMonthName,
  expenses,
  incomes,
  monthlyBudget,
  budgetLoading,
  budgetsLoaded,
  onOpenBudgetDrawer
}: ChartProps) {
  // Calculate navigation limits internally to avoid infinite loops
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

  const { minDate, maxDate } = getDateLimits()
  const prevMonth = new Date(currentYear, currentMonth - 1, 1)
  const nextMonth = new Date(currentYear, currentMonth + 1, 1)

  const canNavigatePrevInternal = prevMonth >= minDate
  const canNavigateNextInternal = nextMonth <= maxDate
  const [selectedSegment, setSelectedSegment] = useState<ChartData | null>(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const handlePieClick = (data: any, index: number) => {
    if (data && index !== undefined) {
      setSelectedSegment(data)
      setIsPopoverOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
        <p className="text-gray-600 mt-2">Loading data...</p>
      </div>
    )
  }

  return (
    <div className="text-center space-y-2 w-full max-w-sm">
      <div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <button
            onClick={() => onNavigateMonth('prev')}
            disabled={!canNavigatePrevInternal}
            className={`p-1 rounded-full transition-colors ${
              canNavigatePrevInternal
                ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-gray-600 text-sm">
            Saldo {getMonthName(currentMonth)} {currentYear}
          </p>
          <button
            onClick={() => onNavigateMonth('next')}
            disabled={!canNavigateNextInternal}
            className={`p-1 rounded-full transition-colors ${
              canNavigateNextInternal
                ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 break-words">
            Rp {balance.toLocaleString('id-ID')}
          </h1>
          {monthlyBudget === 0 && (
            <button
              onClick={onOpenBudgetDrawer}
              className="text-blue-500 hover:text-blue-700 transition-colors"
              title="Set budget for this month"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-center mt-2">
          <p className="text-xs text-gray-500">
            Budget: Rp {monthlyBudget.toLocaleString('id-ID')}
            {!budgetsLoaded && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
          </p>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="h-48 w-48 mx-auto max-w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              onClick={handlePieClick}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Invisible trigger for popover positioning */}
        <div className="absolute opacity-0 pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="w-0 h-0" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 bg-white rounded-xl shadow-lg border" side="top" align="center">
              {selectedSegment && (
                <div className="text-center space-y-2">
                  <div className="font-medium text-sm text-gray-900">
                    {selectedSegment.name}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    Rp {selectedSegment.value.toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs text-gray-600">
                    {((selectedSegment.value / (mode === 'expense' ? totalExpenses : totalIncome)) * 100).toFixed(1)}% of {mode === 'expense' ? 'Expenses' : 'Income'}
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Chart Legend */}
      {/* {data.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="truncate">{entry.name}: Rp {entry.value.toLocaleString('id-ID')}</span>
            </div>
          ))}
        </div>
      )} */}

      <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
        <span className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full transition-all duration-200 ${mode === 'income'
            ? 'bg-green-100 text-green-800 font-bold shadow-sm'
            : 'text-green-600'
          }`}>
          <Plus className="w-4 h-4" />
          {totalIncome.toLocaleString('id-ID')}
        </span>
        <span className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full transition-all duration-200 ${mode === 'expense'
            ? 'bg-red-100 text-red-800 font-bold shadow-sm'
            : 'text-red-600'
          }`}>
          <Minus className="w-4 h-4" />
          {totalExpenses.toLocaleString('id-ID')}
        </span>
      </div>
    </div>
  )
}
