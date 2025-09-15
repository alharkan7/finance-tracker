# PostgreSQL Database Setup Guide

This guide will help you set up the PostgreSQL database using Supabase to replace the JSON file storage.

## Prerequisites

1. A Supabase account (https://supabase.com)
2. A new Supabase project created

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# PostgreSQL Configuration (Supabase Connection Pooler)
POSTGRES_USER=postgres.your-project-ref
POSTGRES_PASSWORD=your-database-password
POSTGRES_HOST=aws-0-region.pooler.supabase.com
POSTGRES_PORT=6543
POSTGRES_DATABASE=postgres
```

You can find these values in your Supabase project dashboard:
- Go to Settings > Database
- Copy the connection pooler details for transaction mode
- Use the transaction connection string details

## Database Migration

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `schema/supabase_migration.sql`
4. Run the SQL script

This will create:
- The `finance_tracker_users` table
- Necessary indexes for performance
- Row Level Security (RLS) policies
- Triggers for automatic timestamp updates
- Default category data

## Features Included

### Database Schema
- **User Management**: Store user profiles with Google OAuth data
- **Sheet Integration**: Link users to their Google Sheets IDs
- **Categories**: Customizable expense and income categories per user
- **Budget Tracking**: Monthly budget settings
- **Preferences**: Extensible JSON preferences storage
- **Audit Trail**: Created/updated timestamps and last login tracking

### Security
- **Row Level Security (RLS)**: Users can only access their own data
- **Service Role Access**: Backend operations use service role for full access
- **JWT-based Authentication**: Integration with NextAuth

### Performance
- **Indexed Queries**: Optimized for common query patterns
- **JSONB Storage**: Efficient storage and querying of categories and preferences
- **Automatic Timestamps**: Trigger-based timestamp management

## Migration from JSON

The new system will:
1. **Automatically create user records** when users sign in via Google OAuth
2. **Store sheet configurations** in the database instead of `user-sheets.json`
3. **Maintain backward compatibility** with existing API endpoints
4. **Provide better error handling** and data validation

## Testing the Migration

1. Start your development server: `pnpm dev`
2. Sign in with Google OAuth
3. Check your Supabase dashboard to see the user record created
4. Set up a Google Sheet to verify the sheet_id is stored correctly
5. Monitor the console logs for any database operation errors

## Rollback Plan

If you need to rollback to JSON storage:
1. Comment out the database imports in the affected files
2. Restore the original file-based implementations
3. The JSON files will continue to work as before

## Benefits of Database Migration

- **Scalability**: Better performance with large numbers of users
- **Reliability**: ACID compliance and backup/recovery
- **Analytics**: Better insights into user behavior
- **Security**: Row-level security and audit trails
- **Extensibility**: Easy to add new features and data relationships
