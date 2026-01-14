'use client'

import React from 'react';
import { categoriesIncome, subjectsIncome } from '@/lib/selections';
import { useMathInput } from '@/lib/math-utils';
import { useVoiceInput } from '@/lib/useVoiceInput';
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DatePicker from "@/components/ui/date-picker"
import { VoiceInputButton } from './voice_input_button';
import { User2, Calendar } from 'lucide-react';

function formatDropdownText(text: string) {
  return <span className="font-medium">{text}</span>
}

interface FormIncomeProps {
  date: string;
  setDate: (date: string) => void;
  subjectValue: string;
  setSubjectValue: (value: string) => void;
  amountValue: string;
  setAmountValue: (value: string) => void;
  categoryValue: string;
  setCategoryValue: (value: string) => void;
  descriptionValue: string;
  setDescriptionValue: (value: string) => void;
  isSubmitting: boolean;
  showValidation: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function FormIncome({
  date,
  setDate,
  subjectValue,
  setSubjectValue,
  amountValue,
  setAmountValue,
  categoryValue,
  setCategoryValue,
  descriptionValue,
  setDescriptionValue,
  isSubmitting,
  showValidation,
  handleSubmit,
}: FormIncomeProps) {
  const { state: voiceState, startListening, stopListening, reset: resetVoice } = useVoiceInput({
    formType: 'income',
    onResult: ({ structured }) => {
      // Auto-fill form fields from structured data
      if (structured.amount !== undefined) {
        setAmountValue(structured.amount.toString());
      }
      if (structured.subject) {
        setSubjectValue(structured.subject);
      }
      if (structured.category) {
        setCategoryValue(structured.category);
      }
      if (structured.date) {
        setDate(structured.date);
      }
      if (structured.description) {
        setDescriptionValue(structured.description);
      }
    },
    onError: (error) => {
      console.error('Voice input error:', error);
    },
    silenceTimeout: 2000,
  });

  const handleVoiceClick = () => {
    if (voiceState === 'listening') {
      // User clicked while listening - stop and process
      stopListening();
      return;
    }
    if (voiceState === 'error') {
      resetVoice();
    }
    startListening();
  };
  const { displayValue, handleAmountChange } = useMathInput(amountValue, setAmountValue);

  return (
    <form className="p-4" onSubmit={handleSubmit}>
      <div className="space-y-2 w-full mb-8">
        <div className="relative text-center">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground font-medium">Rp</span>
          <input
            type="text"
            id="amount"
            placeholder="0"
            inputMode="decimal"
            pattern="[0-9+\-*/\s]*"
            autoComplete="off"
            required
            value={displayValue}
            onChange={handleAmountChange}
            className="w-full text-4xl h-16 font-bold text-center bg-transparent border-b-2 border-border focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground/30 text-foreground"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="space-y-1 flex flex-col items-center">
          <Label htmlFor="subject" className='text-[10px] uppercase tracking-wider text-muted-foreground font-semibold'>Subject</Label>
          <Select
            value={subjectValue}
            required
            onValueChange={setSubjectValue}
          >
            <SelectTrigger
              id="subject"
              className={`w-14 h-14 p-0 flex items-center justify-center rounded-2xl border-0 shadow-sm transition-all hover:scale-105 active:scale-95 [&>svg:last-child]:hidden ${showValidation && !subjectValue ? 'ring-2 ring-destructive bg-destructive/10' :
                subjectValue ? 'bg-primary/10 text-primary ring-2 ring-primary/20' : 'bg-secondary text-secondary-foreground'
                }`}
            >
              <User2 className="h-6 w-6" />
              <span className="sr-only"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              {subjectsIncome.map((subject) => (
                <SelectItem key={subject.value} value={subject.value}>
                  {formatDropdownText(subject.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 flex flex-col items-center">
          <Label htmlFor="category" className='text-[10px] uppercase tracking-wider text-muted-foreground font-semibold'>Category</Label>
          <Select
            value={categoryValue}
            required
            onValueChange={setCategoryValue}
          >
            <SelectTrigger
              id="category"
              className={`w-14 h-14 p-0 flex items-center justify-center rounded-2xl border-0 shadow-sm transition-all hover:scale-105 active:scale-95 [&>svg:last-child]:hidden ${showValidation && !categoryValue ? 'ring-2 ring-destructive bg-destructive/10' :
                categoryValue ? 'bg-primary/10 text-primary ring-2 ring-primary/20' : 'bg-secondary text-secondary-foreground'
                }`}
            >
              {categoryValue ? (
                React.createElement(categoriesIncome.find(cat => cat.value === categoryValue)?.icon || categoriesIncome[0].icon, {
                  className: "h-6 w-6"
                })
              ) : (
                React.createElement(categoriesIncome[0].icon, { className: "h-6 w-6" })
              )}
              <span className="sr-only"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent position="popper">
              {categoriesIncome.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  <div className="flex items-center">
                    <category.icon className="mr-2 h-4 w-4" />
                    {formatDropdownText(category.label)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 flex flex-col items-center">
          <Label htmlFor="date" className='text-[10px] uppercase tracking-wider text-muted-foreground font-semibold'>Date</Label>
          <DatePicker
            date={date}
            setDate={setDate}
            triggerClassName={`w-14 h-14 p-0 flex items-center justify-center rounded-2xl border-0 shadow-sm transition-all hover:scale-105 active:scale-95 ${date ? 'bg-primary/10 text-primary ring-2 ring-primary/20' : 'bg-secondary text-secondary-foreground'
              }`}
            icon={<Calendar className="h-6 w-6 flex-shrink-0" />}
          />
        </div>
      </div>

      <div className="mt-8 mb-6">
        <textarea
          id="description"
          placeholder="Add a note..."
          className="w-full resize-none p-3 rounded-xl bg-background border-2 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground text-sm min-h-[5rem]"
          value={descriptionValue}
          onChange={(e) => {
            setDescriptionValue(e.target.value);
            // Auto expand
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />
      </div>

      <div className="flex gap-3">
        <Button className="flex-1 h-14 text-base rounded-xl shadow-md shadow-primary/20" variant="default" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Income'}
        </Button>
        <div className="h-14 w-14">
          <VoiceInputButton
            state={voiceState}
            onClick={handleVoiceClick}
            disabled={isSubmitting}
            className="w-full h-full rounded-xl"
          />
        </div>
      </div>
    </form>
  );
}
