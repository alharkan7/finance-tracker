'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormExpenses } from './components/form_expenses';
import { FormIncome } from './components/form_income';
import { Button } from "@/components/ui/button"
import { categories } from '@/lib/categories';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion";

export default function Component() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subjectValue, setSubjectValue] = useState('');
  const [amountValue, setAmountValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [reimburseValue, setReimburseValue] = useState('FALSE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [activeTab, setActiveTab] = useState('expense');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    // Validate required fields
    if (!subjectValue || !categoryValue) {
      // setFeedbackMessage('Please fill in all required fields');
      setTimeout(() => {
        setFeedbackMessage('');
      }, 3000);
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(`Submitting ${activeTab === 'expense' ? 'Expense' : 'Income'}...`);

    try {
      // Find the selected category to get its label
      const selectedCategory = categories.find(cat => cat.value === categoryValue);
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

      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setSubjectValue('');
      setAmountValue('');
      setCategoryValue('');
      setDescriptionValue('');
      setReimburseValue('FALSE');
      setShowValidation(false);
      setFeedbackMessage(`${activeTab === 'expense' ? 'Expense' : 'Income'} Submitted Successfully!`);

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
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white p-4 flex items-center justify-center">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center py-6 items-center">
          {/* <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div> */}
          <CardTitle className="text-2xl font-bold">
            Finance Tracker
          </CardTitle>
          <p className="text-sm text-gray-500">Created by <a href="https://x.com/alhrkn" target="_blank" rel="noopener noreferrer">Al</a> & <a href="https://instagram.com/diananurindrasari" target="_blank" rel="noopener noreferrer">Diana</a></p>
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
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="expense"
            className="w-full"
            onValueChange={(value) => {
              setActiveTab(value);
              // Reset all form values
              setDate(new Date().toISOString().split('T')[0]);
              setSubjectValue('');
              setAmountValue('');
              setCategoryValue('');
              setDescriptionValue('');
              if (value === 'expense') {
                setReimburseValue('FALSE');
              }
              setShowValidation(false);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
            <AnimatePresence mode="wait">
              <TabsContent value="expense">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <FormExpenses
                    date={date}
                    setDate={setDate}
                    subjectValue={subjectValue}
                    setSubjectValue={setSubjectValue}
                    amountValue={amountValue}
                    setAmountValue={setAmountValue}
                    categoryValue={categoryValue}
                    setCategoryValue={setCategoryValue}
                    descriptionValue={descriptionValue}
                    setDescriptionValue={setDescriptionValue}
                    reimburseValue={reimburseValue}
                    setReimburseValue={setReimburseValue}
                    isSubmitting={isSubmitting}
                    handleSubmit={handleSubmit}
                    showValidation={showValidation}
                  />
                </motion.div>
              </TabsContent>
              <TabsContent value="income">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <FormIncome
                    date={date}
                    setDate={setDate}
                    subjectValue={subjectValue}
                    setSubjectValue={setSubjectValue}
                    amountValue={amountValue}
                    setAmountValue={setAmountValue}
                    categoryValue={categoryValue}
                    setCategoryValue={setCategoryValue}
                    descriptionValue={descriptionValue}
                    setDescriptionValue={setDescriptionValue}
                    isSubmitting={isSubmitting}
                    handleSubmit={handleSubmit}
                    showValidation={showValidation}
                  />
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
          <div className="flex justify-between mt-4 gap-4">
            <Button
              type="button"
              className="w-1/2 bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 text-gray-700 hover:text-primary-foreground rounded-lg py-4 flex items-center justify-center gap-2 font-medium"
              onClick={() => window.location.href = "https://bit.ly/adexpense-sheets"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
              Sheets
            </Button>
            <Button
              type="button"
              className="w-1/2 bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 text-gray-700 hover:text-primary-foreground rounded-lg py-4 flex items-center justify-center gap-2 font-medium"
              onClick={() => window.location.href = "https://bit.ly/adexpense-dash"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M21 12H3" /><path d="M12 3v18" /></svg>
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
