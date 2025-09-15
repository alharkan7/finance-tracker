import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { setUserSheet, getUserId } from '@/lib/user-sheets';

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
        error: 'You must be logged in to setup sheets'
      }, { status: 401 });
    }

    const body = await req.json();
    const { action, sheetId } = body; // action: 'create' or 'setup-existing'

    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    if (action === 'create') {
      // Create a new spreadsheet
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'Expense Tracker Data',
          },
          sheets: [
            {
              properties: {
                title: 'Expenses',
              },
            },
            {
              properties: {
                title: 'Incomes',
              },
            },
          ],
        },
      });

      const newSheetId = createResponse.data.spreadsheetId!;
      const spreadsheetUrl = createResponse.data.spreadsheetUrl;

      // Setup headers for Expenses sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: newSheetId,
        range: 'Expenses!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Timestamp', 'Subject', 'Date', 'Amount', 'Category', 'Description', 'Reimbursed']],
        },
      });

      // Setup headers for Incomes sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: newSheetId,
        range: 'Incomes!A1:F1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Timestamp', 'Subject', 'Date', 'Amount', 'Category', 'Description']],
        },
      });

      // Save the sheet ID to user's configuration
      const userId = getUserId(session);
      await setUserSheet(userId, session.user.email!, newSheetId);

      return NextResponse.json({
        message: 'Spreadsheet created and configured successfully',
        sheetId: newSheetId,
        spreadsheetUrl,
        serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
      }, { status: 200 });

    } else if (action === 'setup-existing') {
      if (!sheetId) {
        return NextResponse.json({
          message: 'Sheet ID is required for existing sheet setup',
          error: 'Missing sheetId parameter'
        }, { status: 400 });
      }

      // Check if the spreadsheet exists and is accessible
      try {
        const spreadsheetInfo = await sheets.spreadsheets.get({
          spreadsheetId: sheetId,
        });

        // Check if required sheets exist, create them if they don't
        const existingSheets = spreadsheetInfo.data.sheets?.map(sheet => sheet.properties?.title) || [];
        
        const requests: any[] = [];

        if (!existingSheets.includes('Expenses')) {
          requests.push({
            addSheet: {
              properties: {
                title: 'Expenses',
              },
            },
          });
        }

        if (!existingSheets.includes('Incomes')) {
          requests.push({
            addSheet: {
              properties: {
                title: 'Incomes',
              },
            },
          });
        }

        // Create missing sheets if any
        if (requests.length > 0) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
              requests,
            },
          });
        }

        // Setup headers for both sheets (will overwrite if they exist)
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'Expenses!A1:G1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Subject', 'Date', 'Amount', 'Category', 'Description', 'Reimbursed']],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'Incomes!A1:F1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Subject', 'Date', 'Amount', 'Category', 'Description']],
          },
        });

        // Save the sheet ID to user's configuration
        const userId = getUserId(session);
        await setUserSheet(userId, session.user.email!, sheetId);

        return NextResponse.json({
          message: 'Existing spreadsheet setup and configured successfully',
          sheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
          serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
        }, { status: 200 });

      } catch (accessError: any) {
        if (accessError.code === 404) {
          return NextResponse.json({
            message: 'Sheet not found',
            errorType: 'SHEET_NOT_FOUND',
            error: 'The specified Google Sheet does not exist'
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
    } else {
      return NextResponse.json({
        message: 'Invalid action',
        error: 'Action must be either "create" or "setup-existing"'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error setting up sheet:', error);
    
    // Check for service account permission errors
    if (error.code === 403 || error.status === 403) {
      return NextResponse.json({
        message: 'Service account needs permission',
        errorType: 'SERVICE_ACCOUNT_ACCESS_REQUIRED',
        error: 'The service account needs permission to create and access Google Sheets. Please grant access to the service account.',
        serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
      }, { status: 403 });
    }
    
    return NextResponse.json({
      message: 'Error setting up sheet',
      errorType: 'UNKNOWN_ERROR',
      error: error instanceof Error ? error.message : String(error),
      serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
    }, { status: 500 });
  }
}
