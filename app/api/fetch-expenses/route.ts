import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const range = 'Expenses!A:G'; // Fetch all columns including reimbursed

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values || [];

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
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
