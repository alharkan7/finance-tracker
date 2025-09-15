-- SQL Commands to add new columns to existing finance_tracker table
-- Run these commands in DBeaver to update your existing table structure

-- Add updated_at column for tracking record changes
ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add user authentication columns from Google OAuth
ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Add Google Sheets integration column
ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS sheet_id VARCHAR(255);

-- Add user customizable categories as JSON columns with default values
ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS expense_categories JSONB DEFAULT '[
    {"value": "🍔 Food & Beverages", "label": "Food & Beverages", "icon": "Utensils"},
    {"value": "🥫 Snacks", "label": "Snacks", "icon": "Donut"},
    {"value": "👼🏼 Baby", "label": "Baby", "icon": "Baby"},
    {"value": "🛒 Groceries", "label": "Groceries", "icon": "ShoppingBasket"},
    {"value": "🚗 Transportation", "label": "Transportation", "icon": "Bus"},
    {"value": "🎓 Education", "label": "Education", "icon": "Book"},
    {"value": "🍿 Entertainment", "label": "Entertainment", "icon": "Tv"},
    {"value": "🎁 Gift & Donations", "label": "Gift & Donations", "icon": "Gift"},
    {"value": "😊 Family", "label": "Family", "icon": "Users"},
    {"value": "💊 Health", "label": "Health", "icon": "Heart"},
    {"value": "🧾 Bill & Utilities", "label": "Bill & Utilities", "icon": "FileText"},
    {"value": "💵 Fees & Charges", "label": "Fees & Charges", "icon": "DollarSign"},
    {"value": "🛍️ Shopping", "label": "Shopping", "icon": "ShoppingBag"},
    {"value": "💰 Investment", "label": "Investment", "icon": "ChartArea"},
    {"value": "🏠 Accommodation", "label": "Accommodation", "icon": "Home"},
    {"value": "🎲 Others", "label": "Others", "icon": "Dices"}
]'::jsonb;

ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS income_categories JSONB DEFAULT '[
    {"value": "💰 Salary", "label": "Salary", "icon": "Banknote"},
    {"value": "✍🏼 Event", "label": "Event", "icon": "PenLine"},
    {"value": "💼 Business", "label": "Business", "icon": "BriefcaseBusiness"},
    {"value": "🎁 Gift", "label": "Gift", "icon": "Landmark"},
    {"value": "🎲 Others", "label": "Others", "icon": "Dices"}
]'::jsonb;

-- Add budget column
ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS monthly_budget DECIMAL(15,2) DEFAULT 0.00;

-- Add additional columns for future extensibility
ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE finance_tracker 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_finance_tracker_email ON finance_tracker(email);
CREATE INDEX IF NOT EXISTS idx_finance_tracker_sheet_id ON finance_tracker(sheet_id);
CREATE INDEX IF NOT EXISTS idx_finance_tracker_is_active ON finance_tracker(is_active);

-- Create or replace the function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_finance_tracker_updated_at ON finance_tracker;
CREATE TRIGGER update_finance_tracker_updated_at 
    BEFORE UPDATE ON finance_tracker 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN finance_tracker.email IS 'User email from Google OAuth authentication';
COMMENT ON COLUMN finance_tracker.avatar IS 'URL to user Google profile picture';
COMMENT ON COLUMN finance_tracker.sheet_id IS 'Google Sheets ID for user personal expense tracking sheet';
COMMENT ON COLUMN finance_tracker.expense_categories IS 'User customizable expense categories stored as JSON array';
COMMENT ON COLUMN finance_tracker.income_categories IS 'User customizable income categories stored as JSON array';
COMMENT ON COLUMN finance_tracker.monthly_budget IS 'User monthly budget limit in decimal format';
COMMENT ON COLUMN finance_tracker.preferences IS 'Additional user preferences and settings as JSON';

-- Verify the updated table structure
-- Run this to see the new columns:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'finance_tracker' 
-- ORDER BY ordinal_position;
