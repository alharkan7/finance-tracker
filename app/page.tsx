'use client'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Utensils,
  ShoppingBag,
  ShoppingBasket,
  Baby,
  Bus,
  Book,
  Donut,
  Tv,
  Gift,
  Users,
  Heart,
  DollarSign,
  FileText,
  Home,
  MoreHorizontal,
  ChartArea,
  Wallet
} from 'lucide-react';

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

  const [feedbackMessage, setFeedbackMessage] = useState(''); // State for feedback message

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // Disable the Save button
    setFeedbackMessage('Submitting...');

    const data = {
      timestamp,
      date,
      subject: subjectValue,
      amount: amountValue,
      category: categoryValue,
      description: descriptionValue === "" ?
        categoryValue.substring(2).trim() : descriptionValue,
      reimburse: reimburseValue
    };

    const errors = validateForm(data);

    if (errors.length > 0) {
      console.error('Validation errors:', errors);
      setFeedbackMessage("Error: " + errors.join(', '));
      setIsSubmitting(false); // Re-enable the button on error  
      return;
    }

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        console.log('Data successfully submitted');
        setFeedbackMessage("Your Data is Saved!");

        setSubjectValue(''); // Reset subject input
        setAmountValue('');  // Reset amount input
        setCategoryValue(''); // Reset category input
        setDescriptionValue(''); // Reset description input
        setReimburseValue('FALSE'); // Reset checkbox or boolean fields
        setDate(new Date().toISOString().split('T')[0]); // Reset date picker
        setTimeout(() => {
          setFeedbackMessage('');
        }, 3000); // Clear the message after 5 seconds
      } else {
        const errorData = await response.json();
        console.error('Error submitting data:', errorData);
        setFeedbackMessage(`Error: ${errorData.error || 'Failed to submit data. Please try again.'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setFeedbackMessage(`Network Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false); // Re-enable the button once the request is complete
    }
  };

  const validateForm = (data: any) => {
    const errors = [];
    if (!data.subject) {
      errors.push('Please select a subject');
    }
    if (data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    if (!data.category) {
      errors.push('Please select a category');
    }
    return errors;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white p-4 flex items-center justify-center">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center py-6">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Expense Tracker</CardTitle>
          <p className="text-sm text-gray-500">Created by <a href="https://x.com/alhrkn" target="_blank" rel="noopener noreferrer">Al</a> & Diana</p>
          {feedbackMessage && (
            <p className="text-blue-600 font-semibold mt-1">{feedbackMessage}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={subjectValue} required onValueChange={setSubjectValue}>
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Al (Personal)"><b>Al</b> (Personal)</SelectItem>
                    <SelectItem value="Nurin (Personal)"><b>Nurin</b> (Personal)</SelectItem>
                    <SelectItem value="Al (Family)"><b>Al</b> (Family)</SelectItem>
                    <SelectItem value="Nurin (Family)"><b>Nurin</b> (Family)</SelectItem>
                    <SelectItem value="Al (Lainnya)"><b>Al</b> (Lainnya)</SelectItem>
                    <SelectItem value="Nurin (Lainnya)"><b>Nurin</b> (Lainnya)</SelectItem>
                    <SelectItem value="Al & Nurin"><b>Al & Nurin</b></SelectItem>
                  </SelectContent>
                </Select>
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
                <Input type="number" id="amount" placeholder="0" step="1" min="0" inputMode="decimal" required
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryValue} required onValueChange={setCategoryValue}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="🍔Food & Beverages">
                      <div className="flex items-center">
                        <Utensils className="mr-2 h-4 w-4" />
                        <span>Food & Beverages</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🥫 Snacks">
                      <div className="flex items-center">
                        <Donut className="mr-2 h-4 w-4" />
                        <span>Snacks</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="👼🏼 Baby">
                      <div className="flex items-center">
                        <Baby className="mr-2 h-4 w-4" />
                        <span>Baby</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🛒 Groceries">
                      <div className="flex items-center">
                        <ShoppingBasket className="mr-2 h-4 w-4" />
                        <span>Groceries</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🚗 Transportation">
                      <div className="flex items-center">
                        <Bus className="mr-2 h-4 w-4" />
                        <span>Transportation</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🎓 Education">
                      <div className="flex items-center">
                        <Book className="mr-2 h-4 w-4" />
                        <span>Education</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🍿 Entertainment">
                      <div className="flex items-center">
                        <Tv className="mr-2 h-4 w-4" />
                        <span>Entertainment</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🎁 Gift & Donations">
                      <div className="flex items-center">
                        <Gift className="mr-2 h-4 w-4" />
                        <span>Gift & Donations</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="😊 Family">
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Family</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="💊 Health">
                      <div className="flex items-center">
                        <Heart className="mr-2 h-4 w-4" />
                        <span>Health</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🧾 Bill & Utilities">
                      <div className="flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Bill & Utilities</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="💵 Fees & Charges">
                      <div className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" />
                        <span>Fees & Charges</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🛍️ Shopping">
                      <div className="flex items-center">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        <span>Shopping</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="💰 Investment">
                      <div className="flex items-center">
                        <ChartArea className="mr-2 h-4 w-4" />
                        <span>Investment</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🏠 Accommodation">
                      <div className="flex items-center">
                        <Home className="mr-2 h-4 w-4" />
                        <span>Accommodation</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="🎲 Others">
                      <div className="flex items-center">
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        <span>Others</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Textarea id="description" placeholder="Enter a brief description (optional)" className="h-24"
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reimbursed</Label>
              <RadioGroup value={reimburseValue} onValueChange={setReimburseValue} className="flex">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TRUE" id="yes" checked={reimburseValue === 'TRUE'} />
                  <Label htmlFor="yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <RadioGroupItem value="FALSE" id="no" checked={reimburseValue === 'FALSE'} />
                  <Label htmlFor="no">No</Label>
                </div>
              </RadioGroup>
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Save' : 'Save'}
            </Button>
          </form>
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
  )
}
