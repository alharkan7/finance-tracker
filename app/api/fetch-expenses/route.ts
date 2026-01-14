import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Validate environment variables
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      console.error('❌ GOOGLE_PRIVATE_KEY is not set');
      return NextResponse.json({
        message: 'Server configuration error',
        error: 'GOOGLE_PRIVATE_KEY environment variable is missing'
      }, { status: 500 });
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL) {
      console.error('❌ GOOGLE_CLIENT_EMAIL is not set');
      return NextResponse.json({
        message: 'Server configuration error',
        error: 'GOOGLE_CLIENT_EMAIL environment variable is missing'
      }, { status: 500 });
    }

    if (!process.env.GOOGLE_SHEETS_ID) {
      console.error('❌ GOOGLE_SHEETS_ID is not set');
      return NextResponse.json({
        message: 'Server configuration error',
        error: 'GOOGLE_SHEETS_ID environment variable is missing'
      }, { status: 500 });
    }

    // console.log('✅ Environment variables validated');
    // console.log(`📧 Client Email: ${process.env.GOOGLE_CLIENT_EMAIL}`);
    // console.log(`📄 Sheet ID: ${process.env.GOOGLE_SHEETS_ID}`);
    // console.log(`🔑 Private Key length: ${process.env.GOOGLE_PRIVATE_KEY.length} characters`);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // console.log('🔐 GoogleAuth created successfully');

    const sheets = google.sheets({ version: 'v4', auth });
    // console.log('📊 Sheets API client initialized');

    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const range = 'Expenses!A:G'; // Fetch all columns including reimbursed

    // console.log(`🔍 Fetching data from sheet: ${sheetId}, range: ${range}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    // console.log(`✅ Data fetched successfully. Rows: ${response.data.values?.length || 0}`);

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

    // console.log(`📦 Returning ${expenses.length} expense records`);

    return NextResponse.json({ expenses }, { status: 200 });
  } catch (error) {
    console.error('❌ Error fetching expenses:', error);

    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json({
      message: 'Error fetching expenses',
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.name : 'Unknown',
    }, { status: 500 });
  }
}
