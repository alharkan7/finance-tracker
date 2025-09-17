'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, Save, X, Smile, Check, Pencil } from 'lucide-react'
import { Category } from '@/schema/schema'
import { toast } from "sonner"

interface SettingsProps {
  userEmail: string;
  expenseCategories: Category[];
  incomeCategories: Category[];
  loading: boolean;
  onCategoriesUpdated?: () => void;
}

export function Settings({
  userEmail,
  expenseCategories,
  incomeCategories,
  loading,
  onCategoriesUpdated
}: SettingsProps) {
  const [editingExpenseCategories, setEditingExpenseCategories] = useState<Category[]>(expenseCategories)
  const [editingIncomeCategories, setEditingIncomeCategories] = useState<Category[]>(incomeCategories)
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null)
  const [editingCategoryType, setEditingCategoryType] = useState<'expense' | 'income' | null>(null)
  const [editingEmojiIndex, setEditingEmojiIndex] = useState<number | null>(null)
  const [editingEmojiType, setEditingEmojiType] = useState<'expense' | 'income' | null>(null)
  const [saving, setSaving] = useState(false)

  // Update state when props change
  useEffect(() => {
    setEditingExpenseCategories(expenseCategories)
    setEditingIncomeCategories(incomeCategories)
  }, [expenseCategories, incomeCategories])


  // Handle category editing
  const startEditingCategory = (type: 'expense' | 'income', index: number) => {
    setEditingCategoryType(type)
    setEditingCategoryIndex(index)
  }

  const updateCategory = (type: 'expense' | 'income', index: number, field: 'value' | 'label', value: string) => {
    const categories = type === 'expense' ? [...editingExpenseCategories] : [...editingIncomeCategories]
    const currentCategory = categories[index]

    // When updating label, also update the text part of value (keeping the emoji)
    if (field === 'label') {
      const emoji = currentCategory.value.split(' ')[0] || '' // Get emoji from current value
      const newValue = emoji ? `${emoji} ${value}` : value
      categories[index] = { ...currentCategory, label: value, value: newValue }
    } else {
      // When updating value directly, keep it as is
      categories[index] = { ...currentCategory, [field]: value }
    }

    if (type === 'expense') {
      setEditingExpenseCategories(categories)
    } else {
      setEditingIncomeCategories(categories)
    }
  }

  const cancelCategoryEdit = () => {
    setEditingCategoryIndex(null)
    setEditingCategoryType(null)
  }

  const saveCategoryEdit = () => {
    setEditingCategoryIndex(null)
    setEditingCategoryType(null)
  }

  // Common emojis for category selection
  const commonEmojis = [
    '🍔', '🥫', '🍕', '🍜', '🥗', '🍎', '🍌', '🥑', '🍞', '🥛',
    '🚗', '⛽', '🚌', '🚕', '🚲', '🏠', '🏢', '🏪', '🏥', '🎓',
    '🍿', '🎬', '🎵', '🎮', '🎲', '📚', '✈️', '🏖️', '🎁', '💝',
    '💊', '🏥', '🦷', '👓', '💄', '🧾', '💡', '🔧', '🛠️', '💰',
    '💵', '💳', '🏦', '📊', '💼', '✍️', '🎯', '📱', '💻', '🖥️',
    '🛒', '🛍️', '👕', '👟', '⌚', '💎', '🏺', '🛋️', '🧹', '🧺',
    '🏃', '💪', '🧘', '🎨', '🎭', '📸', '🎤', '🎸', '⚽', '🏀',
    '🎾', '🏊', '🚴', '⛷️', '🏂', '🎪', '🎢', '🎨', '🎭', '🎪',
    '💻', '📱', '📺', '🎵', '📖', '✈️', '🚗', '🏠', '🍽️', '☕',
    '🍺', '🍷', '🍹', '🎂', '🍰', '🍦', '🍪', '🍩', '🍿', '🍫'
  ]

  const startEditingEmoji = (type: 'expense' | 'income', index: number) => {
    setEditingEmojiIndex(index)
    setEditingEmojiType(type)
  }

  const updateEmoji = (type: 'expense' | 'income', index: number, emoji: string) => {
    const categories = type === 'expense' ? [...editingExpenseCategories] : [...editingIncomeCategories]
    const currentCategory = categories[index]
    const currentValue = currentCategory.value

    // Update the first character (emoji) while keeping the rest of the text
    const parts = currentValue.split(' ')
    let newValue: string
    let newLabel: string

    if (parts.length > 1) {
      // Has text after emoji, keep the text part
      newValue = `${emoji} ${parts.slice(1).join(' ')}`
      newLabel = parts.slice(1).join(' ')
    } else {
      // No text after emoji, use emoji as both value and label
      newValue = emoji
      newLabel = emoji
    }

    categories[index] = { ...currentCategory, value: newValue, label: newLabel }

    if (type === 'expense') {
      setEditingExpenseCategories(categories)
    } else {
      setEditingIncomeCategories(categories)
    }

    // Close emoji picker
    setEditingEmojiIndex(null)
    setEditingEmojiType(null)
  }

  const cancelEmojiEdit = () => {
    setEditingEmojiIndex(null)
    setEditingEmojiType(null)
  }

  // Save all settings
  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseCategories: editingExpenseCategories,
          incomeCategories: editingIncomeCategories
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast.success('Settings saved successfully!')

      // Notify parent component to refresh categories
      if (onCategoriesUpdated) {
        onCategoriesUpdated()
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }


  // Main settings UI with scrollable content
  return (
    <div className="flex flex-col h-full max-h-[calc(80vh-8rem)]">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="space-y-6">

          {/* Expense Categories Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {editingExpenseCategories.map((category, index) => (
                <div key={index} className="flex flex-col gap-2 p-2 border border-gray-200 rounded rounded-lg">
                  {/* Category Row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditingEmoji('expense', index)}
                      className="text-lg hover:bg-gray-100 rounded px-1 py-0.5 transition-colors cursor-pointer"
                      title="Click to change emoji"
                    >
                      {category.value.split(' ')[0]}
                    </button>
                    {editingCategoryType === 'expense' && editingCategoryIndex === index ? (
                      <>
                        <Input
                          value={category.label}
                          onChange={(e) => updateCategory('expense', index, 'label', e.target.value)}
                          className="flex-1 text-sm rounded-lg"
                        />
                        <Button size="sm" variant="neutral" onClick={saveCategoryEdit}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="neutral" onClick={cancelCategoryEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{category.label}</span>
                        <Button
                          size="sm"
                          variant="neutral"
                          onClick={() => startEditingCategory('expense', index)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Emoji Picker */}
                  {editingEmojiType === 'expense' && editingEmojiIndex === index && (
                    <div className="bg-gray-50 border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Smile className="w-4 h-4" />
                          <span className="text-sm font-medium">Choose an emoji:</span>
                        </div>
                        <Button size="sm" variant="neutral" onClick={cancelEmojiEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
                        {commonEmojis.map((emoji, emojiIndex) => (
                          <button
                            key={emojiIndex}
                            onClick={() => updateEmoji('expense', index, emoji)}
                            className="text-lg hover:bg-gray-200 rounded p-1 transition-colors"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Income Categories Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Categories</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {editingIncomeCategories.map((category, index) => (
                <div key={index} className="flex flex-col gap-2 p-2 border border-gray-200 rounded rounded-lg">
                  {/* Category Row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditingEmoji('income', index)}
                      className="text-lg hover:bg-gray-100 rounded px-1 py-0.5 transition-colors cursor-pointer"
                      title="Click to change emoji"
                    >
                      {category.value.split(' ')[0]}
                    </button>
                    {editingCategoryType === 'income' && editingCategoryIndex === index ? (
                      <>
                        <Input
                          value={category.label}
                          onChange={(e) => updateCategory('income', index, 'label', e.target.value)}
                          className="flex-1 text-sm rounded-lg"
                        />
                        <Button size="sm" variant="neutral" onClick={saveCategoryEdit}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="neutral" onClick={cancelCategoryEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{category.label}</span>
                        <Button
                          size="sm"
                          variant="neutral"
                          onClick={() => startEditingCategory('income', index)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Emoji Picker */}
                  {editingEmojiType === 'income' && editingEmojiIndex === index && (
                    <div className="bg-gray-50 border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Smile className="w-4 h-4" />
                          <span className="text-sm font-medium">Choose an emoji:</span>
                        </div>
                        <Button size="sm" variant="neutral" onClick={cancelEmojiEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
                        {commonEmojis.map((emoji, emojiIndex) => (
                          <button
                            key={emojiIndex}
                            onClick={() => updateEmoji('income', index, emoji)}
                            className="text-lg hover:bg-gray-200 rounded p-1 transition-colors"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Fixed Footer with Save Button */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white pt-2 pb-2 mt-2">
        <div className="flex justify-end pr-4">
          <Button
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
