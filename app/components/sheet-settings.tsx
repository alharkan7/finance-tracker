'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { AlertCircle, Plus, Share, LogIn, Copy, ExternalLink, CheckCircle } from 'lucide-react'

interface SheetError {
  message: string;
  errorType: string;
  error: string;
  serviceAccount?: string;
  sheetUrl?: string;
}

interface SheetSettingsProps {
  error: SheetError | null;
  userSheetId: string | null;
  hasUserSheet: boolean;
  onCreateSheet: () => Promise<void>;
  onSetupExistingSheet: () => Promise<void>;
  onRetryFetch: () => Promise<void>;
  onClearError: () => void;
  loading: boolean;
}

export function SheetSettings({
  error,
  userSheetId,
  hasUserSheet,
  onCreateSheet,
  onSetupExistingSheet,
  onRetryFetch,
  onClearError,
  loading
}: SheetSettingsProps) {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [showManagement, setShowManagement] = useState(false)

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

  // Show user sheet info when connected
  if (!error && hasUserSheet && !showManagement) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Connected to your personal Google Sheet
            </span>
          </div>
          <Button
            variant="neutral"
            size="sm"
            onClick={() => setShowManagement(true)}
            className="text-xs"
            disabled={loading}
          >
            Manage
          </Button>
        </div>
        {userSheetId && (
          <p className="text-xs text-blue-600 mt-1 font-mono">
            ID: {userSheetId.substring(0, 20)}...
          </p>
        )}
      </div>
    )
  }

  // Show management interface
  if (showManagement && hasUserSheet) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-blue-800">Sheet Management</h3>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => setShowManagement(false)}
              className="text-xs"
              disabled={loading}
            >
              Back
            </Button>
          </div>
          <div className="space-y-2">
            <Button onClick={onCreateSheet} className="w-full" size="sm" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Sheet
            </Button>
            <Button onClick={onSetupExistingSheet} variant="neutral" className="w-full" size="sm" disabled={loading}>
              <Share className="w-4 h-4 mr-2" />
              Connect Different Sheet
            </Button>
            {userSheetId && (
              <Button
                onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${userSheetId}`, '_blank')}
                variant="neutral"
                className="w-full"
                size="sm"
                disabled={loading}
              >
                Open Current Sheet
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (!error) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
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
          
          {error.errorType === 'SHEET_NOT_FOUND' && (
            <div className="space-y-2">
              <Button onClick={onCreateSheet} className="w-full" size="sm" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Sheet
              </Button>
              <Button onClick={onSetupExistingSheet} variant="neutral" className="w-full" size="sm" disabled={loading}>
                <Share className="w-4 h-4 mr-2" />
                Try Different Sheet
              </Button>
            </div>
          )}
          
          {error.errorType === 'ACCESS_DENIED' && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2">🔐 Sheet Access Required</h4>
                <p className="text-sm text-orange-700 mb-3">
                  The service account needs access to your Google Sheet. Please grant access:
                </p>
                
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Copy Service Account Email</p>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                      <code className="text-xs flex-1 text-gray-800 break-all">
                        {error.serviceAccount}
                      </code>
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={() => copyServiceAccountEmail(error.serviceAccount!)}
                        className="flex-shrink-0"
                        disabled={loading}
                      >
                        {copiedEmail ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white rounded p-3 border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Grant Access to Your Sheet</p>
                    <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                      <li>Open your Google Sheet</li>
                      <li>Click "Share" button</li>
                      <li>Paste the service account email (copied above)</li>
                      <li>Set permission to "Editor"</li>
                      <li>Click "Send" (no notification needed)</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={onRetryFetch} className="w-full" size="sm" disabled={loading}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I've Granted Access - Retry
                </Button>
                <Button onClick={onSetupExistingSheet} variant="neutral" className="w-full" size="sm" disabled={loading}>
                  <Share className="w-4 h-4 mr-2" />
                  Try Different Sheet
                </Button>
              </div>
            </div>
          )}
          
          {error.errorType === 'SHEET_TAB_NOT_FOUND' && (
            <div className="space-y-2">
              <Button onClick={onSetupExistingSheet} className="w-full" size="sm" disabled={loading}>
                Setup Sheet Structure
              </Button>
            </div>
          )}
          
          {error.errorType === 'AUTHENTICATION_REQUIRED' && (
            <div className="space-y-2">
              <Button onClick={() => signIn('google')} className="w-full" size="sm" disabled={loading}>
                <LogIn className="w-4 h-4 mr-2" />
                Sign In Again
              </Button>
            </div>
          )}

          {error.errorType === 'MISSING_ACCESS_TOKEN' && (
            <div className="space-y-2">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-700">
                  🔄 Need to refresh permissions for Google Sheets access.
                </p>
              </div>
              <Button onClick={() => signIn('google')} className="w-full" size="sm" disabled={loading}>
                <LogIn className="w-4 h-4 mr-2" />
                Refresh Permissions
              </Button>
            </div>
          )}

          {error.errorType === 'SHEET_CREATED_NEEDS_SHARING' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">✅ Sheet Created Successfully!</h4>
                <p className="text-sm text-green-700 mb-3">
                  Your Google Sheet was created, but we need to manually share it with our service account to access your data.
                </p>
                
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Step 1: Open Your New Sheet</p>
                    <Button
                      onClick={() => window.open(error.sheetUrl, '_blank')}
                      variant="neutral"
                      size="sm"
                      className="w-full text-xs"
                      disabled={loading}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      Open Your Sheet
                    </Button>
                  </div>

                  <div className="bg-white rounded p-3 border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Step 2: Copy Service Account Email</p>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                      <code className="text-xs flex-1 text-gray-800 break-all">
                        {error.serviceAccount}
                      </code>
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={() => copyServiceAccountEmail(error.serviceAccount!)}
                        className="flex-shrink-0"
                        disabled={loading}
                      >
                        {copiedEmail ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white rounded p-3 border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Step 3: Share Your Sheet</p>
                    <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                      <li>In your sheet, click the "Share" button</li>
                      <li>Paste the service account email</li>
                      <li>Set permission to "Editor"</li>
                      <li>Click "Send"</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={onRetryFetch} className="w-full" size="sm" disabled={loading}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I've Shared the Sheet - Start Tracking!
                </Button>
                <Button onClick={onClearError} variant="neutral" className="w-full" size="sm" disabled={loading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {error.errorType === 'SERVICE_ACCOUNT_ACCESS_REQUIRED' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">🔑 Service Account Access Required</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Don't worry! We try to automatically grant permissions, but if that fails, you can manually grant access following these steps:
                </p>
                
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Step 1: Copy Service Account Email</p>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                      <code className="text-xs flex-1 text-gray-800 break-all">
                        {error.serviceAccount}
                      </code>
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={() => copyServiceAccountEmail(error.serviceAccount!)}
                        className="flex-shrink-0"
                        disabled={loading}
                      >
                        {copiedEmail ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white rounded p-3 border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Step 2: Create or Open Your Google Sheet</p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => window.open('https://sheets.google.com', '_blank')}
                        variant="neutral"
                        size="sm"
                        className="w-full text-xs"
                        disabled={loading}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Open Google Sheets
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white rounded p-3 border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Step 3: Share Sheet with Service Account</p>
                    <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                      <li>Click "Share" button in your Google Sheet</li>
                      <li>Paste the service account email (copied above)</li>
                      <li>Set permission to "Editor"</li>
                      <li>Click "Send" (no notification needed)</li>
                    </ol>
                  </div>

                  <div className="bg-white rounded p-3 border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Step 4: Get Your Sheet ID</p>
                    <p className="text-xs text-gray-600">
                      Copy the Sheet ID from your Google Sheet URL:<br/>
                      <code className="bg-gray-100 px-1 rounded">docs.google.com/spreadsheets/d/<span className="font-bold text-blue-600">[SHEET_ID]</span>/edit</code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={onCreateSheet} className="w-full" size="sm" disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Try Automatic Setup
                </Button>
                <Button onClick={onSetupExistingSheet} variant="neutral" className="w-full" size="sm" disabled={loading}>
                  <Share className="w-4 h-4 mr-2" />
                  Manual Setup (I've Granted Access)
                </Button>
                <Button onClick={onClearError} variant="neutral" className="w-full" size="sm" disabled={loading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
