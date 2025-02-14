'use client'

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { categoriesIncome } from '@/lib/categories';

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
    return (
        <form className="space-y-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 rounded-lg bg-white" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select 
                        value={subjectValue} 
                        required 
                        onValueChange={setSubjectValue}
                    >
                        <SelectTrigger 
                            id="subject"
                            className={`border-2 ${showValidation && !subjectValue ? 'border-red-500 focus:ring-red-500' : ''}`}
                        >
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Al (Personal)">Al</SelectItem>
                            <SelectItem value="Nurin (Personal)">Nurin</SelectItem>                        </SelectContent>
                    </Select>
                    {showValidation && !subjectValue && (
                        <p className="text-sm text-red-500 mt-1">Please select a subject</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <div className="relative">
                        <Input
                            type="date"
                            id="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full"
                            required
                        />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                        type="number"
                        id="amount"
                        placeholder="0"
                        step="1"
                        min="0"
                        inputMode="decimal"
                        required
                        value={amountValue}
                        onChange={(e) => setAmountValue(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                        value={categoryValue} 
                        required 
                        onValueChange={setCategoryValue}
                    >
                        <SelectTrigger 
                            id="category" 
                            className={`border-2 ${showValidation && !categoryValue ? 'border-red-500 focus:ring-red-500' : ''}`}
                        >
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                            {categoriesIncome.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                    <div className="flex items-center">
                                        <category.icon className="mr-2 h-4 w-4" />
                                        <span>{category.label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {showValidation && !categoryValue && (
                        <p className="text-sm text-red-500 mt-1">Please select a category</p>
                    )}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                    id="description"
                    placeholder="Enter a brief description (optional)"
                    className="h-24"
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                />
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Save' : 'Save'}
            </Button>
        </form>
    );
}
