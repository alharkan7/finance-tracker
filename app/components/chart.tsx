'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Plus, Minus, Loader2, Info } from 'lucide-react'
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
}

export function Chart({ data, totalIncome, totalExpenses, balance, loading, mode = 'expense' }: ChartProps) {
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
        <p className="text-gray-600 text-sm">Saldo saat ini</p>
        <h1 className="text-2xl font-bold text-gray-900 break-words">
          Rp {balance.toLocaleString('id-ID')}
        </h1>
        <div className="flex justify-center gap-4 mt-2 text-sm">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-200 ${
            mode === 'income'
              ? 'bg-green-100 text-green-800 font-bold shadow-sm'
              : 'text-green-600'
          }`}>
            <Plus className="w-4 h-4" />
            {totalIncome.toLocaleString('id-ID')}
          </span>
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-200 ${
            mode === 'expense'
              ? 'bg-red-100 text-red-800 font-bold shadow-sm'
              : 'text-red-600'
          }`}>
            <Minus className="w-4 h-4" />
            {totalExpenses.toLocaleString('id-ID')}
          </span>
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
    </div>
  )
}
