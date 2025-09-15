'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

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
}

export function Chart({ data, totalIncome, totalExpenses, balance, loading }: ChartProps) {
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading data...</p>
      </div>
    )
  }

  return (
    <div className="text-center space-y-2 w-full">
      <div>
        <p className="text-gray-600 text-sm">Saldo saat ini</p>
        <h1 className="text-2xl font-bold text-gray-900 break-words">
          Rp {balance.toLocaleString('id-ID')}
        </h1>
        <div className="flex justify-center gap-4 mt-2 text-sm">
          <span className="text-green-600">Income: Rp {totalIncome.toLocaleString('id-ID')}</span>
          <span className="text-red-600">Expenses: Rp {totalExpenses.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="h-48 w-48 mx-auto max-w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
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
