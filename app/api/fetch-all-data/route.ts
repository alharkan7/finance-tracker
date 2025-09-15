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
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
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
    // Check authentication once
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to access this resource'
      }, { status: 401 });
    }

    // Setup Google Auth once
    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get user-specific sheet ID once
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

    // Check spreadsheet access once
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

    // Fetch all data in parallel
    const [expensesResponse, incomesResponse, budgetsResponse] = await Promise.all([
      // Fetch expenses
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Expenses!A:E',
      }).catch(error => {
        if (error.message?.includes('Unable to parse range')) {
          return { data: { values: [['timestamp', 'date', 'amount', 'category', 'description']] } };
        }
        throw error;
      }),

      // Fetch incomes
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Incomes!A:E',
      }).catch(error => {
        if (error.message?.includes('Unable to parse range')) {
          return { data: { values: [['timestamp', 'date', 'amount', 'category', 'description']] } };
        }
        throw error;
      }),

      // Fetch budgets (last 2 years)
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Budget!A:D',
      }).catch(error => {
        if (error.message?.includes('Unable to parse range')) {
          return { data: { values: [['timestamp', 'date', 'amount', 'notes']] } };
        }
        throw error;
      })
    ]);

    // Process expenses data
    const expensesRows = expensesResponse.data.values || [];
    const expenses = expensesRows.length <= 1 ? [] : expensesRows.slice(1).map((row: any[]) => ({
      timestamp: row[0] || '',
      date: row[1] || '',
      amount: parseFloat(row[2]) || 0,
      category: row[3] || '',
      description: row[4] || '',
    }));

    // Process incomes data
    const incomesRows = incomesResponse.data.values || [];
    const incomes = incomesRows.length <= 1 ? [] : incomesRows.slice(1).map((row: any[]) => ({
      timestamp: row[0] || '',
      date: row[1] || '',
      amount: parseFloat(row[2]) || 0,
      category: row[3] || '',
      description: row[4] || '',
    }));

    // Process budgets data
    const budgetsRows = budgetsResponse.data.values || [];
    const budgets = budgetsRows.length <= 1 ? [] : budgetsRows.slice(1).map((row: any[]) => ({
      timestamp: row[0] || '',
      date: row[1] || '',
      amount: parseFloat(row[2]) || 0,
      notes: row[3] || ''
    }));

    return NextResponse.json({
      expenses,
      incomes,
      budgets,
      message: 'All data fetched successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching all data:', error);
    return NextResponse.json({
      message: 'Error fetching data',
      errorType: 'UNKNOWN_ERROR',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
