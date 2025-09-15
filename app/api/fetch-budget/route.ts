import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { getUserSheet } from '@/lib/user-sheets';

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
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to fetch budget data'
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({
        message: 'Missing parameters',
        error: 'startDate and endDate are required'
      }, { status: 400 });
    }

    // Get user's sheet ID
    const userId = session.user.email!;
    const userSheet = await getUserSheet(userId);

    if (!userSheet) {
      return NextResponse.json({
        message: 'No sheet configured',
        error: 'Please configure your Google Sheet first'
      }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch budget data from the Budget sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: userSheet.sheetId,
      range: 'Budget!A:D',
    });

    const rows = response.data.values || [];

    if (rows.length <= 1) {
      // Only headers or empty sheet
      return NextResponse.json({
        budgets: [],
        message: 'No budget data found'
      });
    }

    // Parse budget data (skip header row)
    const budgets = rows.slice(1).map((row, index) => ({
      timestamp: row[0] || '',
      date: row[1] || '',
      amount: parseFloat(row[2] || '0'),
      notes: row[3] || ''
    })).filter(budget => {
      // Filter by date range if provided
      if (budget.date >= startDate && budget.date <= endDate) {
        return true;
      }
      return false;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      budgets,
      message: 'Budget data fetched successfully'
    });

  } catch (error: any) {
    console.error('Error fetching budget data:', error);

    if (error.code === 403) {
      return NextResponse.json({
        message: 'Access denied',
        error: 'No permission to access the Google Sheet'
      }, { status: 403 });
    }

    return NextResponse.json({
      message: 'Error fetching budget data',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
