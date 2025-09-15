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

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to submit budget data'
      }, { status: 401 });
    }

    const body = await req.json();
    const { date, amount, notes } = body;

    if (!date || typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({
        message: 'Invalid data',
        error: 'Date and valid amount are required'
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

    // Check if the Budget sheet has headers by reading the first row
    const headerCheckResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: userSheet.sheetId,
      range: 'Budget!A1:D1',
    });

    const hasHeaders = headerCheckResponse.data.values && headerCheckResponse.data.values.length > 0;

    // If no headers exist, add them first
    if (!hasHeaders) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: userSheet.sheetId,
        range: 'Budget!A1:D1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Timestamp', 'Date', 'Amount', 'Notes']],
        },
      });
    }

    // Format timestamp
    const now = new Date();
    const timestamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    // Check if there's already a budget entry for this month
    const budgetData = await sheets.spreadsheets.values.get({
      spreadsheetId: userSheet.sheetId,
      range: 'Budget!A:D',
    });

    const rows = budgetData.data.values || [];
    let existingRowIndex = -1;

    // Find existing budget entry for the same month
    const targetMonth = date.substring(0, 7); // YYYY-MM format
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] && rows[i][1].startsWith(targetMonth)) {
        existingRowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Update existing entry
      await sheets.spreadsheets.values.update({
        spreadsheetId: userSheet.sheetId,
        range: `Budget!A${existingRowIndex}:D${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[timestamp, date, amount, notes || '']],
        },
      });
    } else {
      // Add new entry - append to the sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: userSheet.sheetId,
        range: 'Budget!A:D',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[timestamp, date, amount, notes || '']],
        },
      });
    }

    return NextResponse.json({
      message: 'Budget data saved successfully',
      timestamp,
      date,
      amount,
      notes
    });

  } catch (error: any) {
    console.error('Error submitting budget data:', error);

    if (error.code === 403) {
      return NextResponse.json({
        message: 'Access denied',
        error: 'No permission to access the Google Sheet'
      }, { status: 403 });
    }

    return NextResponse.json({
      message: 'Error submitting budget data',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
