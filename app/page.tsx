'use client'

import { useState, useEffect, useCallback } from 'react'
import { FormExpenses } from './components/form_expenses';
import { FormIncome } from './components/form_income';
import { FormReport } from './components/form_report';
import { SheetsIcon, DashboardIcon } from './components/icons';
import { Button } from "@/components/ui/button"
import { categories, categoriesIncome } from '@/lib/selections';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion";

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

export default function FinanceTrackerPage() {
  // Expense form state
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseSubject, setExpenseSubject] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseReimburse, setExpenseReimburse] = useState('FALSE');
  const [expenseShowValidation, setExpenseShowValidation] = useState(false);

  // Income form state
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeSubject, setIncomeSubject] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomeShowValidation, setIncomeShowValidation] = useState(false);

  // Shared state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [activeTab, setActiveTab] = useState('expense');

  // Report data state
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [incomes, setIncomes] = useState<IncomeData[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const timestamp = (() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  })();

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    if (dataLoaded) return; // Don't fetch if data is already loaded

    setReportLoading(true);
    setReportError(null);
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
      setReportError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setReportLoading(false);
    }
  }, [dataLoaded]);

  // Fetch data when component mounts
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Refresh report data
  const refreshReportData = async () => {
    setDataLoaded(false);
    await fetchReportData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get current form values based on active tab
    const isExpense = activeTab === 'expense';
    const date = isExpense ? expenseDate : incomeDate;
    const subjectValue = isExpense ? expenseSubject : incomeSubject;
    const amountValue = isExpense ? expenseAmount : incomeAmount;
    const categoryValue = isExpense ? expenseCategory : incomeCategory;
    const descriptionValue = isExpense ? expenseDescription : incomeDescription;
    const reimburseValue = isExpense ? expenseReimburse : 'FALSE';
    const setShowValidation = isExpense ? setExpenseShowValidation : setIncomeShowValidation;

    setShowValidation(true);

    // Validate required fields
    if (!subjectValue || !categoryValue) {
      setTimeout(() => {
        setFeedbackMessage('');
      }, 3000);
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(`Submitting ${activeTab === 'expense' ? 'Expense' : 'Income'}...`);

    try {
      // Find the selected category to get its label
      const categoryArray = activeTab === 'expense' ? categories : categoriesIncome;
      const selectedCategory = categoryArray.find(cat => cat.value === categoryValue);
      const description = descriptionValue.trim() || selectedCategory?.label || categoryValue;

      const response = await fetch(`/api/submit-${activeTab}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp,
          date,
          subject: subjectValue,
          amount: parseFloat(amountValue),
          category: categoryValue,
          description,
          reimbursed: reimburseValue,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit ${activeTab}`);
      }

      // Reset form for the active tab
      if (isExpense) {
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setExpenseSubject('');
        setExpenseAmount('');
        setExpenseCategory('');
        setExpenseDescription('');
        setExpenseReimburse('FALSE');
        setExpenseShowValidation(false);
      } else {
        setIncomeDate(new Date().toISOString().split('T')[0]);
        setIncomeSubject('');
        setIncomeAmount('');
        setIncomeCategory('');
        setIncomeDescription('');
        setIncomeShowValidation(false);
      }
      setFeedbackMessage(`${isExpense ? 'Expense' : 'Income'} Submitted Successfully!`);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setFeedbackMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setFeedbackMessage(`Failed to submit ${activeTab}. Please try again.`);

      // Clear error message after 3 seconds
      setTimeout(() => {
        setFeedbackMessage('');
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100vh] flex flex-col items-center justify-center">
      <div className="w-full max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted/20 hover:scrollbar-thumb-muted/40 py-2 px-4">
        <div className="max-w-sm mx-auto relative bg-card py-6 px-0 rounded-sm">

          <div className="text-center py-6 items-center">
            <h2 className="text-2xl font-bold inline-flex items-center gap-2">
              Finance Tracker
            </h2>
            {feedbackMessage && (
              <div className={`mt-4 px-3 py-1 text-sm font-medium rounded-md ${feedbackMessage.toLowerCase().includes('successfully')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : feedbackMessage.includes('Submitting')
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                {feedbackMessage}
              </div>
            )}
          </div>
          <div className="py-4 px-0">
            <Tabs
              defaultValue="expense"
              className="w-full"
              onValueChange={(value: string) => {
                setActiveTab(value);
                // Don't clear form data when switching tabs - preserve user input
              }}
            >
              <TabsList className="grid w-full grid-cols-3 bg-bg text-text">
                <TabsTrigger
                  value="expense"
                  className="data-[state=active]:bg-main data-[state=active]:text-mtext"
                >
                  Expense
                </TabsTrigger>
                <TabsTrigger
                  value="income"
                  className="data-[state=active]:bg-main data-[state=active]:text-mtext"
                >
                  Income
                </TabsTrigger>
                <TabsTrigger
                  value="report"
                  className="data-[state=active]:bg-main data-[state=active]:text-mtext"
                >
                  Reports
                </TabsTrigger>
              </TabsList>
              <AnimatePresence initial={false}>
                <TabsContent key="expense" value="expense">
                  <motion.div
                    key="expense-motion"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg shadow-shadow border-2 border-border text-mtext p-0"
                  >
                    <FormExpenses
                      date={expenseDate}
                      setDate={setExpenseDate}
                      subjectValue={expenseSubject}
                      setSubjectValue={setExpenseSubject}
                      amountValue={expenseAmount}
                      setAmountValue={setExpenseAmount}
                      categoryValue={expenseCategory}
                      setCategoryValue={setExpenseCategory}
                      descriptionValue={expenseDescription}
                      setDescriptionValue={setExpenseDescription}
                      reimburseValue={expenseReimburse}
                      setReimburseValue={setExpenseReimburse}
                      isSubmitting={isSubmitting}
                      handleSubmit={handleSubmit}
                      showValidation={expenseShowValidation}
                    />
                  </motion.div>
                </TabsContent>
                <TabsContent key="income" value="income">
                  <motion.div
                    key="expense-motion"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg shadow-shadow border-2 border-border text-mtext p-0"
                  >
                    <FormIncome
                      date={incomeDate}
                      setDate={setIncomeDate}
                      subjectValue={incomeSubject}
                      setSubjectValue={setIncomeSubject}
                      amountValue={incomeAmount}
                      setAmountValue={setIncomeAmount}
                      categoryValue={incomeCategory}
                      setCategoryValue={setIncomeCategory}
                      descriptionValue={incomeDescription}
                      setDescriptionValue={setIncomeDescription}
                      isSubmitting={isSubmitting}
                      handleSubmit={handleSubmit}
                      showValidation={incomeShowValidation}
                    />
                  </motion.div>
                </TabsContent>
                <TabsContent key="report" value="report">
                  <motion.div
                    key="report-motion"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg shadow-shadow border-2 border-border text-mtext p-0"
                  >
                    <FormReport
                      expenses={expenses}
                      incomes={incomes}
                      loading={reportLoading}
                      error={reportError}
                      onRefresh={refreshReportData}
                    />
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
            <div className="flex justify-between mt-4 gap-4">
              <Button
                type="button"
                variant='neutral'
                className="w-1/2 gap-2"
                onClick={() => window.location.href = process.env.NEXT_PUBLIC_SHEETS_URL || "https://bit.ly/pocket-tracker-sheet"}
              >
                <SheetsIcon />
                Sheets
              </Button>
              <Button
                type="button"
                variant='neutral'
                className="w-1/2 gap-2"
                onClick={() => window.location.href = process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://bit.ly/pocket-tracker-dashboard"}
              >
                <DashboardIcon />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 py-1 text-center text-xs bg-background">
      </div>
    </div>
  );
}
