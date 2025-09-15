'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Plus, Share, Copy, LogIn, Check, ExternalLink, CheckCircle, Pencil, Save, X, Smile, ChevronDown, ChevronUp } from 'lucide-react'
import { Category } from '@/schema/schema'
import { toast } from "sonner"

interface SheetError {
  message: string;
  errorType: string;
  error: string;
  serviceAccount?: string;
  sheetUrl?: string;
}

interface SettingsProps {
  error: SheetError | null;
  userSheetId: string | null;
  hasUserSheet: boolean;
  userEmail: string;
  expenseCategories: Category[];
  incomeCategories: Category[];
  onCreateSheet: () => Promise<void>;
  onSetupExistingSheet: () => Promise<void>;
  onRetryFetch: () => Promise<void>;
  onClearError: () => void;
  onSheetIdUpdate?: () => void;
  loading: boolean;
}

export function SheetSettings({
  error,
  userSheetId,
  hasUserSheet,
  userEmail,
  expenseCategories,
  incomeCategories,
  onCreateSheet,
  onSetupExistingSheet,
  onRetryFetch,
  onClearError,
  onSheetIdUpdate,
  loading
}: SettingsProps) {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [sheetId, setSheetId] = useState(userSheetId || '')
  const [editingSheetId, setEditingSheetId] = useState(false)
  const [editingExpenseCategories, setEditingExpenseCategories] = useState<Category[]>(expenseCategories)
  const [editingIncomeCategories, setEditingIncomeCategories] = useState<Category[]>(incomeCategories)
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null)
  const [editingCategoryType, setEditingCategoryType] = useState<'expense' | 'income' | null>(null)
  const [editingEmojiIndex, setEditingEmojiIndex] = useState<number | null>(null)
  const [editingEmojiType, setEditingEmojiType] = useState<'expense' | 'income' | null>(null)
  const [saving, setSaving] = useState(false)
  const [permissionStepsExpanded, setPermissionStepsExpanded] = useState(false)

  // Update state when props change
  useEffect(() => {
    setSheetId(userSheetId || '')
    setEditingExpenseCategories(expenseCategories)
    setEditingIncomeCategories(incomeCategories)
  }, [userSheetId, expenseCategories, incomeCategories])

  // Parse Google Sheets ID from URL
  const parseSheetId = (input: string): string => {
    // Extract sheet ID from Google Sheets URL
    const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (urlMatch) {
      return urlMatch[1]
    }
    // If it's already just an ID, return as is
    return input.trim()
  }

  // Handle sheet ID update
  const handleSheetIdUpdate = async () => {
    if (!sheetId.trim()) return

    setSaving(true)
    try {
      const parsedId = parseSheetId(sheetId)
      setSheetId(parsedId)
      setEditingSheetId(false)

      // Update sheet ID via API
      const response = await fetch('/api/user-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: parsedId })
      })

      if (!response.ok) {
        throw new Error('Failed to update sheet ID')
      }

      // Trigger data refresh in parent component
      if (onSheetIdUpdate) {
        onSheetIdUpdate()
        toast.success('Sheet ID updated successfully! Refreshing data...')
      }
    } catch (error) {
      console.error('Error updating sheet ID:', error)
    } finally {
      setSaving(false)
    }
  }

  // Handle category editing
  const startEditingCategory = (type: 'expense' | 'income', index: number) => {
    setEditingCategoryType(type)
    setEditingCategoryIndex(index)
  }

  const updateCategory = (type: 'expense' | 'income', index: number, field: 'value' | 'label', value: string) => {
    const categories = type === 'expense' ? [...editingExpenseCategories] : [...editingIncomeCategories]
    categories[index] = { ...categories[index], [field]: value }

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
    const currentValue = categories[index].value

    // Update the first character (emoji) while keeping the rest of the text
    const parts = currentValue.split(' ')
    if (parts.length > 1) {
      categories[index] = { ...categories[index], value: `${emoji} ${parts.slice(1).join(' ')}` }
    } else {
      categories[index] = { ...categories[index], value: emoji }
    }

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
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Copy service account email to clipboard
  const copyServiceAccountEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = email
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  // Main settings UI with scrollable content
  return (
    <div className="flex flex-col h-full max-h-[calc(80vh-8rem)]">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="space-y-6">
          {/* Google Sheets Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Sheets</h3>

            <div className="space-y-4">
              {/* Current Sheet ID */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Current Sheet ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  {editingSheetId ? (
                    <>
                      <Input
                        value={sheetId}
                        onChange={(e) => setSheetId(e.target.value)}
                        placeholder="Enter sheet ID or URL"
                        className="flex-1 rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={handleSheetIdUpdate}
                        disabled={saving}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={() => setEditingSheetId(false)}
                        disabled={saving}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        value={sheetId || 'No sheet configured'}
                        readOnly
                        className="flex-1 bg-gray-50 rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={() => setEditingSheetId(true)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Paste Google Sheets ID or URL
                </p>
              </div>

              {/* Sheet Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={onCreateSheet}
                  size="sm"
                  disabled={loading || saving}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New
                </Button>
                {userSheetId && (
                  <Button
                    onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${userSheetId}`, '_blank')}
                    variant="neutral"
                    size="sm"
                    disabled={loading || saving}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Sheet
                  </Button>
                )}
              </div>

              {/* Permission Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <button
                  onClick={() => setPermissionStepsExpanded(!permissionStepsExpanded)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h4 className="text-sm font-semibold text-blue-900">Grant Permission Steps</h4>
                  {permissionStepsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-blue-600" />
                  )}
                </button>
                {permissionStepsExpanded && (
                  <div className="space-y-3 mt-3">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                      <div className="flex-1">
                        <p className="text-sm text-blue-800 mb-2">Copy this service account email:</p>
                        <div className="flex items-center gap-2 p-2 bg-white border border-blue-300 rounded">
                          <code className="text-xs text-gray-700 flex-1">expense-tracker@hobby-project-435405.iam.gserviceaccount.com</code>
                          <Button
                            size="sm"
                            variant="neutral"
                            onClick={() => copyServiceAccountEmail('expense-tracker@hobby-project-435405.iam.gserviceaccount.com')}
                            className="flex items-center justify-center w-8 h-8 p-0"
                          >
                            {copiedEmail ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
                      <div className="flex-1">
                        <p className="text-sm text-blue-800">Add it as <strong>Editor</strong> on your Google Sheet:</p>
                        <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc">
                          <li>Open your Google Sheet</li>
                          <li>Click "Share" button</li>
                          <li>Paste the email and set as Editor</li>
                          <li>Click "Send"</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

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

          {/* Error Section */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-800 mb-2">{error.message}</h3>
                  <p className="text-sm text-red-600 mb-3">{error.error}</p>

                  {error.errorType === 'SHEET_NOT_CONFIGURED' && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-700">
                          ✨ <strong>Quick Setup:</strong> We'll automatically create your sheet and grant the necessary permissions!
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Note: If you signed in before, you may need to refresh permissions for automatic setup.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Button onClick={onCreateSheet} className="w-full" size="sm" disabled={loading}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Sheet
                        </Button>
                        <Button onClick={onSetupExistingSheet} variant="neutral" className="w-full" size="sm" disabled={loading}>
                          <Share className="w-4 h-4 mr-2" />
                          Use Existing Sheet
                        </Button>
                        <Button
                          onClick={() => signIn('google')}
                          variant="neutral"
                          className="w-full"
                          size="sm"
                          disabled={loading}
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Refresh Permissions
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Other error types remain the same */}
                </div>
              </div>
            </div>
          )}
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
