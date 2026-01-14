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
      setFeedbackMessage(`${isExpense ? 'Expense' : 'Income'} Saved`);

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <div className="w-full max-w-md mx-auto px-4 py-8 md:py-12">
        <div className="space-y-6">

          <header className="flex flex-col items-center justify-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Finance Tracker
            </h1>
            {/* <p className="text-sm text-muted-foreground">
              Manage your expenses and income
            </p> */}
          </header>

          <AnimatePresence mode="wait">
            {feedbackMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`w-full p-3 rounded-lg text-sm font-medium text-center shadow-sm ${feedbackMessage.toLowerCase().includes('saved')
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : feedbackMessage.includes('Submitting')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
              >
                {feedbackMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <Tabs
            defaultValue="expense"
            className="w-full"
            onValueChange={(value: string) => {
              setActiveTab(value);
            }}
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="report">Reports</TabsTrigger>
            </TabsList>

            <AnimatePresence mode='wait'>
              <TabsContent key="expense" value="expense" className="mt-0">
                <motion.div
                  key="expense-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card rounded-2xl shadow-sm border border-border/40 p-1"
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

              <TabsContent key="income" value="income" className="mt-0">
                <motion.div
                  key="income-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card rounded-2xl shadow-sm border border-border/40 p-1"
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

              <TabsContent key="report" value="report" className="mt-0">
                <motion.div
                  key="report-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card rounded-2xl shadow-sm border border-border/40 p-1"
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

          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button
              type="button"
              variant='outline'
              className="w-full gap-2 h-12 rounded-xl bg-secondary/50 hover:bg-secondary border-transparent text-secondary-foreground"
              onClick={() => window.location.href = process.env.NEXT_PUBLIC_SHEETS_URL || "https://bit.ly/pocket-tracker-sheet"}
            >
              <SheetsIcon />
              Sheets
            </Button>
            <Button
              type="button"
              variant='outline'
              className="w-full gap-2 h-12 rounded-xl bg-secondary/50 hover:bg-secondary border-transparent text-secondary-foreground"
              onClick={() => window.location.href = process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://bit.ly/pocket-tracker-dashboard"}
            >
              <DashboardIcon />
              Dashboard
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
