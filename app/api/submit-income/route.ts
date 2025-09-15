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

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to submit income'
      }, { status: 401 });
    }

    const body = await req.json();
    const { timestamp, subject, date, amount, category, description } = body;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'), // Replace newline characters
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
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
    const range = 'Incomes!A:E'; // Change this to 'Sheet1!A1:E1' for appending on new row

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      includeValuesInResponse: true,
      insertDataOption: 'INSERT_ROWS', // This should append new row
      requestBody: {
        values: [[timestamp, subject, date, amount, category, description]],
      },
    });

    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error('Detailed error:', {
      name: error instanceof Error ? error.name : 'Unknown Error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });
    return NextResponse.json({ 
      message: 'Error submitting data',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
