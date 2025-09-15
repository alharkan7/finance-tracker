import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import { DatabaseService } from '@/lib/database';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }: any) {
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

// GET - Retrieve user's custom categories
export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({
        message: 'Unauthorized',
        error: 'You must be logged in to access categories'
      }, { status: 401 });
    }

    const user = await DatabaseService.findUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({
        message: 'User not found',
        error: 'User account not found'
      }, { status: 404 });
    }

    // Parse categories from database (stored as JSON strings)
    const expenseCategories = user.expense_categories || [];
    const incomeCategories = user.income_categories || [];

    return NextResponse.json({
      message: 'Categories retrieved successfully',
      expense_categories: expenseCategories,
      income_categories: incomeCategories
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting user categories:', error);
    return NextResponse.json({
      message: 'Error retrieving categories',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
