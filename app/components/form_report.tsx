'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, RefreshCw } from 'lucide-react';
import DatePicker from "@/components/ui/date-picker"
import { subjects, subjectsIncome } from '@/lib/selections';

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

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
];

export function FormReport() {
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [incomes, setIncomes] = useState<IncomeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>(() => {
    const today = new Date();
    // Create date in local timezone to avoid UTC conversion issues
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
  });
  const [dateToFilter, setDateToFilter] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
  const [reimbursedFilter, setReimbursedFilter] = useState<string>('all');
  const [activeReportTab, setActiveReportTab] = useState('expenses');

  const fetchData = useCallback(async () => {
    if (dataLoaded) return; // Don't fetch if data is already loaded

    setLoading(true);
    setError(null);
    try {
      const [expensesRes, incomesRes] = await Promise.all([
        fetch('/api/fetch-expenses'),
        fetch('/api/fetch-income')
      ]);

      if (!expensesRes.ok || !incomesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const expensesData = await expensesRes.json();
      const incomesData = await incomesRes.json();

      setExpenses(expensesData.expenses || []);
      setIncomes(incomesData.incomes || []);
      setDataLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [dataLoaded]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';

    // Handle different date formats from spreadsheet
    // Try to parse as YYYY-MM-DD first
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    // Try to parse other formats (MM/DD/YYYY, DD/MM/YYYY, etc.)
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return dateStr;
  };

  const filterData = (data: any[], type: 'expenses' | 'incomes') => {
    return data.filter(item => {
      // Subject filter
      if (subjectFilter !== 'all' && item.subject !== subjectFilter) {
        return false;
      }

      // Date range filter - using the "Date" column (not timestamp)
      const itemDate = normalizeDate(item.date);
      if (dateFromFilter && itemDate && itemDate < dateFromFilter) {
        return false;
      }
      if (dateToFilter && itemDate && itemDate > dateToFilter) {
        return false;
      }

      // Reimbursed filter (only for expenses)
      if (type === 'expenses' && reimbursedFilter !== 'all' && item.reimbursed !== reimbursedFilter) {
        return false;
      }

      return true;
    });
  };

  const prepareChartData = (data: any[]): ChartData[] => {
    const categoryTotals: { [key: string]: number } = {};

    data.forEach(item => {
      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = 0;
      }
      categoryTotals[item.category] += item.amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount], index) => ({
        name: category,
        value: amount,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  };

  const filteredExpenses = filterData(expenses, 'expenses');
  const filteredIncomes = filterData(incomes, 'incomes');

  const expensesChartData = prepareChartData(filteredExpenses);
  const incomesChartData = prepareChartData(filteredIncomes);

  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIncomes = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / (activeReportTab === 'expenses' ? totalExpenses : totalIncomes)) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.payload.name}</p>
          <p className="text-blue-600 font-semibold">{formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-600">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  const refreshData = async () => {
    setDataLoaded(false);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading report data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <Button onClick={refreshData} variant="neutral">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Report Tabs */}
      <Tabs value={activeReportTab} onValueChange={setActiveReportTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="incomes">Income</TabsTrigger>
        </TabsList>

        {/* Expenses Report */}
        <TabsContent value="expenses" className="space-y-2">
          {/* Filters */}
          <div className="space-y-2">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Subject Filter */}
              <div className="space-y-2">
                {/* <Label htmlFor="subject-filter">Subject</Label> */}
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {(activeReportTab === 'expenses' ? subjects : subjectsIncome).map((subject) => (
                      <SelectItem key={subject.value} value={subject.value}>
                        {subject.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                {/* <Label htmlFor="date-from">From</Label> */}
                <DatePicker
                  date={dateFromFilter}
                  setDate={setDateFromFilter}
                  triggerClassName="w-full"
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                {/* <Label htmlFor="date-to">To</Label> */}
                <DatePicker
                  date={dateToFilter}
                  setDate={setDateToFilter}
                  triggerClassName="w-full"
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>

              {/* Reimbursed Filter (only for expenses) */}
              {activeReportTab === 'expenses' && (
                <div className="space-y-2">
                  {/* <Label htmlFor="reimbursed-filter">Reimbursed</Label> */}
                  <Select value={reimbursedFilter} onValueChange={setReimbursedFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reimbursed</SelectItem>
                      <SelectItem value="TRUE">Yes</SelectItem>
                      <SelectItem value="FALSE">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

          </div>
          <div className="text-center !mt-4 !mb-0">
            <h4 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
              Total Expenses
              <RefreshCw 
                className="h-4 w-4 cursor-pointer hover:text-primary transition-colors" 
                onClick={refreshData}
              />
            </h4>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalExpenses)}</p>
            <p className="text-sm text-primary/50">{filteredExpenses.length} Transactions</p>
          </div>

          {expensesChartData.length > 0 ? (
            <div className="space-y-2">
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <Pie
                      data={expensesChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={110}
                      innerRadius={55}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom Legend */}
              <div className="flex flex-wrap justify-center gap-2 px-2">
                {expensesChartData.map((entry) => {
                  const percentage = ((entry.value / totalExpenses) * 100).toFixed(1);
                  return (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: entry.color }}
                      ></div>
                      <span>{entry.name} ({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No expense data matches the selected filters.</p>
            </div>
          )}
        </TabsContent>

        {/* Income Report */}
        <TabsContent value="incomes" className="space-y-4">
                    {/* Filters */}
          <div className="space-y-2">

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Subject Filter */}
              <div className="space-y-2">
                {/* <Label htmlFor="subject-filter">Subject</Label> */}
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {(activeReportTab === 'expenses' ? subjects : subjectsIncome).map((subject) => (
                      <SelectItem key={subject.value} value={subject.value}>
                        {subject.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                {/* <Label htmlFor="date-from">From</Label> */}
                <DatePicker
                  date={dateFromFilter}
                  setDate={setDateFromFilter}
                  triggerClassName="w-full"
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                {/* <Label htmlFor="date-to">To</Label> */}
                <DatePicker
                  date={dateToFilter}
                  setDate={setDateToFilter}
                  triggerClassName="w-full"
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
          <div className="text-center !mt-4 !mb-0">
            <h4 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
              Total Income
              <RefreshCw 
                className="h-4 w-4 cursor-pointer hover:text-primary transition-colors" 
                onClick={refreshData}
              />
            </h4>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalIncomes)}</p>
            <p className="text-sm text-primary/50">{filteredIncomes.length} Transactions</p>
          </div>

          {incomesChartData.length > 0 ? (
            <div className="space-y-2">
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <Pie
                      data={incomesChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={110}
                      innerRadius={55}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Total</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(totalIncomes)}</div>
                  </div>
                </div>
              </div>
              {/* Custom Legend */}
              <div className="flex flex-wrap justify-center gap-2 px-2">
                {incomesChartData.map((entry) => {
                  const percentage = ((entry.value / totalIncomes) * 100).toFixed(1);
                  return (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: entry.color }}
                      ></div>
                      <span>{entry.name} ({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No income data matches the selected filters.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      {/* <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Total Expenses</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Total Income</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncomes)}</p>
        </div>
      </div> */}
    </div>
  );
}
