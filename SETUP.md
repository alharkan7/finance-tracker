# Google Sheets Integration Setup

This guide will help you set up Google Sheets integration for your expense tracker.

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID=your-oauth-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-oauth-client-secret

# Google Service Account (for sheets access)
GOOGLE_CLIENT_EMAIL=your-service-account-email@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"

# NextAuth
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000
```

## User-Specific Google Sheets

🎉 **Each user now has their own personal Google Sheet!**

- No more shared data between users
- Each user's expenses and income are completely private
- Automatic sheet creation and management per user
- Users can switch between different sheets if needed

## Setup Process

### Option 1: Automatic Setup (Recommended) ✨
1. Sign in to the app with your Google account
2. Click "Create New Sheet" when prompted
3. **The app automatically:**
   - Creates a personal Google Sheet for you
   - Grants the service account access permissions
   - Sets up proper sheet structure
   - Saves your sheet ID to your profile
4. Start tracking expenses immediately!

### Option 2: Use Existing Sheet
1. Create or use an existing Google Sheet
2. In the app, click "Use Existing Sheet" and enter your Sheet ID
3. **The app automatically:**
   - Tries to grant service account access permissions
   - Sets up the required tabs and headers
   - Saves your sheet ID to your profile
4. If automatic permissions fail, manual sharing instructions will appear

## 🚀 Automatic Permission Management

**New Feature:** The app now automatically handles service account permissions!

### How it works:
- **OAuth Integration**: Uses your Google account to automatically grant permissions
- **No Manual Sharing**: No need to manually share sheets with the service account
- **Seamless Experience**: Just click "Create New Sheet" and everything is set up automatically

### Fallback Process:
If automatic permissions fail, the app will show manual instructions:

1. **Copy service account email**: `expense-tracker@hobby-project-435405.iam.gserviceaccount.com`
2. **Manual sharing steps**:
   - Open your Google Sheet
   - Click "Share" button 
   - Paste the service account email
   - Set permission to "Editor"
   - Click "Send" (no notification needed)

## Sheet Structure

The app expects these tabs with these headers:

### Expenses Sheet
- Column A: Timestamp
- Column B: Subject  
- Column C: Date
- Column D: Amount
- Column E: Category
- Column F: Description
- Column G: Reimbursed

### Incomes Sheet
- Column A: Timestamp
- Column B: Subject
- Column C: Date
- Column D: Amount
- Column E: Category
- Column F: Description

## Authentication & Authorization

The app requires users to log in with their Google account to access their personal expense data:

1. **User Authentication**: Users must sign in with Google OAuth
2. **Personal Data Isolation**: Each user gets their own Google Sheet
3. **User Sheet Management**: Sheet IDs are stored per user account
4. **Google Sheets Access**: Uses service account credentials for sheet operations
5. **Security**: Only authenticated users can view/modify their own data
6. **Session Management**: Automatic session handling with NextAuth

## User Data Storage

- User sheet configurations are stored in `data/user-sheets.json`
- Each user is identified by their email address
- Sheet IDs are linked to specific user accounts
- Users can change or manage their connected sheets
- Data directory is excluded from version control

## Error Handling

The app handles these scenarios:
- **Not logged in**: Shows login screen with Google sign-in
- **Session expired**: Prompts to sign in again
- **Sheet not configured**: Prompts to create or setup sheet
- **Sheet not found**: Offers to create new or try different sheet
- **Access denied**: Shows service account email and retry option
- **Missing tabs**: Automatically creates required tabs

## Getting Google Credentials

### 1. Google OAuth (for user authentication)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID and Client Secret

### 2. Google Service Account (for sheets access)
1. In the same project, go to "Credentials" → "Create Credentials" → "Service Account"
2. Create a service account and download the JSON key file
3. Use the `client_email` and `private_key` from the JSON file

## Required Google APIs

Make sure these APIs are enabled in your Google Cloud project:
- Google Sheets API
- Google Drive API (optional, for better error handling)
