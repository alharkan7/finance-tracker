import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { getUserSheet, getUserId } from '@/lib/user-sheets';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: any) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to access this resource'
      }, { status: 401 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get user-specific sheet ID
    const userId = getUserId(session);
    const userSheet = await getUserSheet(userId);

    if (!userSheet) {
      return NextResponse.json({
        message: 'Sheet not configured',
        errorType: 'SHEET_NOT_CONFIGURED',
        error: 'No Google Sheet configured for your account. Please set up a sheet first.'
      }, { status: 400 });
    }

    const sheetId = userSheet.sheetId;

    // First, check if the spreadsheet exists and is accessible
    try {
      await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
    } catch (accessError: any) {
      if (accessError.code === 404) {
        return NextResponse.json({
          message: 'Sheet not found',
          errorType: 'SHEET_NOT_FOUND',
          error: 'The specified Google Sheet does not exist or has been deleted'
        }, { status: 404 });
      } else if (accessError.code === 403) {
        return NextResponse.json({
          message: 'Access denied',
          errorType: 'ACCESS_DENIED',
          error: 'No permission to access this Google Sheet. Please grant access to the service account.',
          serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
        }, { status: 403 });
      }
      throw accessError;
    }

    const range = 'Expenses!A:G'; // Fetch all columns including reimbursed

    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });
    } catch (sheetError: any) {
      if (sheetError.message?.includes('Unable to parse range')) {
        return NextResponse.json({
          message: 'Sheet tab not found',
          errorType: 'SHEET_TAB_NOT_FOUND',
          error: 'The "Expenses" tab does not exist in the spreadsheet. Please create it or check the sheet structure.'
        }, { status: 400 });
      }
      throw sheetError;
    }

    const rows = response.data.values || [];

    // If no data or only header row
    if (rows.length <= 1) {
      return NextResponse.json({ 
        expenses: [],
        message: 'No expense data found'
      }, { status: 200 });
    }

    // Skip header row and map data
    // Using Date column (index 2) for filtering, not Timestamp column (index 0)
    const expenses = rows.slice(1).map((row: any[]) => ({
      timestamp: row[0] || '', // Column A: Timestamp
      subject: row[1] || '',    // Column B: Subject
      date: row[2] || '',       // Column C: Date (used for filtering)
      amount: parseFloat(row[3]) || 0, // Column D: Amount
      category: row[4] || '',   // Column E: Category
      description: row[5] || '', // Column F: Description
      reimbursed: row[6] || 'FALSE', // Column G: Reimbursed
    }));

    return NextResponse.json({ expenses }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({
      message: 'Error fetching expenses',
      errorType: 'UNKNOWN_ERROR',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
