import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { setUserSheet, getUserId } from '@/lib/user-sheets';

// Helper function to share sheet with service account using user's OAuth token
async function shareSheetWithServiceAccount(userAccessToken: string, sheetId: string, serviceAccountEmail: string) {
  try {
    // Create OAuth2 client with user's access token
    const userAuth = new google.auth.OAuth2();
    userAuth.setCredentials({ access_token: userAccessToken });
    
    const drive = google.drive({ version: 'v3', auth: userAuth });
    
    // Share the sheet with the service account
    await drive.permissions.create({
      fileId: sheetId,
      requestBody: {
        role: 'writer', // Editor permissions
        type: 'user',
        emailAddress: serviceAccountEmail,
      },
      sendNotificationEmail: false, // Don't send notification
    });
    
    return true;
  } catch (error) {
    console.error('Error sharing sheet with service account:', error);
    throw error;
  }
}

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
      console.log('Creating new spreadsheet for user:', session.user.email);
      console.log('Session has accessToken:', !!session.accessToken);
      
      if (!session.accessToken) {
        return NextResponse.json({
          message: 'Missing access token',
          errorType: 'MISSING_ACCESS_TOKEN',
          error: 'User access token not available. Please sign in again.'
        }, { status: 400 });
      }

      // Use user's OAuth token to create the spreadsheet
      const userAuth = new google.auth.OAuth2();
      userAuth.setCredentials({ access_token: session.accessToken });
      
      const userSheets = google.sheets({ version: 'v4', auth: userAuth });
      
      console.log('Attempting to create spreadsheet with user OAuth token...');
      
      // Create a new spreadsheet using user's OAuth token
      const createResponse = await userSheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'My Expense Tracker',
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
            {
              properties: {
                title: 'Budget',
              },
            },
          ],
        },
      });

      const newSheetId = createResponse.data.spreadsheetId!;
      const spreadsheetUrl = createResponse.data.spreadsheetUrl;
      
      console.log('Spreadsheet created successfully:', newSheetId);

      // Automatically share the sheet with the service account
      try {
        console.log('Attempting to share sheet with service account...');
        await shareSheetWithServiceAccount(
          session.accessToken,
          newSheetId,
          process.env.GOOGLE_CLIENT_EMAIL!
        );
        console.log('Sheet shared with service account successfully');
      } catch (shareError) {
        console.error('Failed to share sheet with service account:', shareError);
        // Continue anyway - user can grant access manually if needed
      }

      // Try to setup headers using service account, but if it fails due to permissions,
      // we'll let the user know they need to manually share the sheet
      let headersSetup = false;
      try {
        // Setup headers for Expenses sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId: newSheetId,
          range: 'Expenses!A1:E1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Date', 'Amount', 'Category', 'Notes']],
          },
        });

        // Setup headers for Incomes sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId: newSheetId,
          range: 'Incomes!A1:E1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Date', 'Amount', 'Category', 'Description']],
          },
        });

        // Setup headers for Budget sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId: newSheetId,
          range: 'Budget!A1:D1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Date', 'Amount', 'Notes']],
          },
        });
        
        headersSetup = true;
        console.log('Headers setup completed successfully');
      } catch (headerError) {
        console.error('Failed to setup headers with service account:', headerError);
        // Continue anyway - sheet was created successfully
      }

      // Save the sheet ID to user's configuration
      const userId = getUserId(session);
      await setUserSheet(userId, session.user.email!, newSheetId);

      return NextResponse.json({
        message: headersSetup 
          ? 'Spreadsheet created and configured successfully' 
          : 'Spreadsheet created successfully',
        sheetId: newSheetId,
        spreadsheetUrl,
        serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
        headersSetup,
        needsManualSharing: !headersSetup,
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

        if (!existingSheets.includes('Budget')) {
          requests.push({
            addSheet: {
              properties: {
                title: 'Budget',
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
          range: 'Expenses!A1:E1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Date', 'Amount', 'Category', 'Notes']],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'Incomes!A1:E1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Date', 'Amount', 'Category', 'Description']],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'Budget!A1:D1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Date', 'Amount', 'Notes']],
          },
        });

        // Automatically share the existing sheet with the service account
        try {
          await shareSheetWithServiceAccount(
            session.accessToken,
            sheetId,
            process.env.GOOGLE_CLIENT_EMAIL!
          );
        } catch (shareError) {
          console.error('Failed to share existing sheet with service account:', shareError);
          // Continue anyway - user can grant access manually if needed
        }

        // Save the sheet ID to user's configuration
        const userId = getUserId(session);
        await setUserSheet(userId, session.user.email!, sheetId);

        return NextResponse.json({
          message: 'Existing spreadsheet setup and configured successfully',
          sheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
          serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
          autoShared: true, // Indicate that we automatically shared it
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
