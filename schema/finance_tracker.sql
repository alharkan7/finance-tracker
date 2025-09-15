-- PostgreSQL Schema for Finance Tracker
-- This file contains the complete schema for the finance_tracker application

-- Main table for user profiles and settings
CREATE TABLE IF NOT EXISTS finance_tracker (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- User authentication data from Google OAuth
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar TEXT, -- URL to user's Google profile picture
    
    -- Google Sheets integration
    sheet_id VARCHAR(255), -- Google Sheets ID for user's personal sheet
    
    -- User customizable categories (stored as JSON)
    expense_categories JSONB DEFAULT '[
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
    ]'::jsonb,
    
    income_categories JSONB DEFAULT '[
        {"value": "💰 Salary", "label": "Salary", "icon": "Banknote"},
        {"value": "✍🏼 Event", "label": "Event", "icon": "PenLine"},
        {"value": "💼 Business", "label": "Business", "icon": "BriefcaseBusiness"},
        {"value": "🎁 Gift", "label": "Gift", "icon": "Landmark"},
        {"value": "🎲 Others", "label": "Others", "icon": "Dices"}
    ]'::jsonb,
    
    -- Budget settings
    monthly_budget DECIMAL(15,2) DEFAULT 0.00,
    
    -- Additional user preferences (can be extended in future)
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_finance_tracker_email ON finance_tracker(email);
CREATE INDEX IF NOT EXISTS idx_finance_tracker_sheet_id ON finance_tracker(sheet_id);
CREATE INDEX IF NOT EXISTS idx_finance_tracker_is_active ON finance_tracker(is_active);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on row changes
DROP TRIGGER IF EXISTS update_finance_tracker_updated_at ON finance_tracker;
CREATE TRIGGER update_finance_tracker_updated_at 
    BEFORE UPDATE ON finance_tracker 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE finance_tracker IS 'Main table storing user profiles and financial tracking settings';
COMMENT ON COLUMN finance_tracker.email IS 'User email from Google OAuth authentication';
COMMENT ON COLUMN finance_tracker.avatar IS 'URL to user Google profile picture';
COMMENT ON COLUMN finance_tracker.sheet_id IS 'Google Sheets ID for user personal expense tracking sheet';
COMMENT ON COLUMN finance_tracker.expense_categories IS 'User customizable expense categories stored as JSON array';
COMMENT ON COLUMN finance_tracker.income_categories IS 'User customizable income categories stored as JSON array';
COMMENT ON COLUMN finance_tracker.monthly_budget IS 'User monthly budget limit in decimal format';
COMMENT ON COLUMN finance_tracker.preferences IS 'Additional user preferences and settings as JSON';
