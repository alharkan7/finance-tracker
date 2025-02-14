'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet } from 'lucide-react';
import { FormExpenses } from './components/form_expenses';
import { Button } from "@/components/ui/button"

export default function Component() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subjectValue, setSubjectValue] = useState('');
  const [amountValue, setAmountValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [reimburseValue, setReimburseValue] = useState('FALSE');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMessage('Submitting expense...');

    try {
      const response = await fetch('/api/submit-expense', {
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
          description: descriptionValue,
          reimbursed: reimburseValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit expense');
      }

      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setSubjectValue('');
      setAmountValue('');
      setCategoryValue('');
      setDescriptionValue('');
      setReimburseValue('FALSE');
      setFeedbackMessage('Expense submitted successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setFeedbackMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setFeedbackMessage('Failed to submit expense. Please try again.');

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
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Expense Tracker
          </CardTitle>
          <p className="text-sm text-gray-500">Created by <a href="https://x.com/alhrkn" target="_blank" rel="noopener noreferrer">Al</a> & Diana</p>
          {feedbackMessage && (
            <div className={`mt-4 p-3 text-sm font-medium rounded-md ${
              feedbackMessage.includes('successfully')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : feedbackMessage.includes('Submitting')
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {feedbackMessage}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
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
          />
          <div className="flex justify-between mb-4">
            <Button type="button" className="w-1/2 mr-2 bg-transparent border border-blue-500 hover:bg-blue-500 hover:text-white rounded py-2 text-blue-500" onClick={() => window.location.href = "https://bit.ly/adexpense-sheets"}>
              Sheets
            </Button>
            <Button type="button" className="w-1/2 ml-2 bg-transparent border border-blue-500 hover:bg-blue-500 hover:text-white rounded py-2 text-blue-500" onClick={() => window.location.href = "https://bit.ly/adexpense-dashboards"}>
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
