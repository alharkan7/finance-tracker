-- Finance Tracker Users Table for Supabase
-- Run this SQL in your Supabase SQL editor

-- Create the finance_tracker table
CREATE TABLE IF NOT EXISTS public.finance_tracker (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- User authentication data
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar TEXT,
    
    -- Google Sheets integration
    sheet_id VARCHAR(100),
    
    -- User categories (stored as JSONB for better performance)
    expense_categories JSONB DEFAULT '[]'::jsonb NOT NULL,
    income_categories JSONB DEFAULT '[]'::jsonb NOT NULL,
    
    -- Budget settings
    monthly_budget DECIMAL(12,2) DEFAULT 0 NOT NULL,
    
    -- User preferences
    preferences JSONB DEFAULT '{}'::jsonb NOT NULL,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_login TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_finance_tracker_email ON public.finance_tracker(email);
CREATE INDEX IF NOT EXISTS idx_finance_tracker_sheet_id ON public.finance_tracker(sheet_id);
CREATE INDEX IF NOT EXISTS idx_finance_tracker_is_active ON public.finance_tracker(is_active);
CREATE INDEX IF NOT EXISTS idx_finance_tracker_created_at ON public.finance_tracker(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_finance_tracker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row changes
DROP TRIGGER IF EXISTS trigger_update_finance_tracker_updated_at ON public.finance_tracker;
CREATE TRIGGER trigger_update_finance_tracker_updated_at
    BEFORE UPDATE ON public.finance_tracker
    FOR EACH ROW
    EXECUTE FUNCTION public.update_finance_tracker_updated_at();

-- Insert default expense categories data
INSERT INTO public.finance_tracker (email, expense_categories, income_categories, is_active) 
VALUES ('__DEFAULT_CATEGORIES__', 
    '[
        {"value": "🍔 Food & Beverages", "label": "Food & Beverages", "icon": "Utensils"},
        {"value": "🥫 Snacks", "label": "Snacks", "icon": "Donut"},
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
    '[
        {"value": "💰 Salary", "label": "Salary", "icon": "Banknote"},
        {"value": "✍🏼 Event", "label": "Event", "icon": "PenLine"},
        {"value": "💼 Business", "label": "Business", "icon": "BriefcaseBusiness"},
        {"value": "🎁 Gift", "label": "Gift", "icon": "Landmark"},
        {"value": "🎲 Others", "label": "Others", "icon": "Dices"}
    ]'::jsonb,
    false
) ON CONFLICT (email) DO NOTHING;

-- Create Row Level Security (RLS) policies
ALTER TABLE public.finance_tracker ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON public.finance_tracker
    FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update own profile" ON public.finance_tracker
    FOR UPDATE USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Users can insert own profile" ON public.finance_tracker
    FOR INSERT WITH CHECK (email = auth.jwt() ->> 'email');

-- Allow service role to bypass RLS for backend operations
CREATE POLICY "Service role full access" ON public.finance_tracker
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON public.finance_tracker TO anon;
GRANT ALL ON public.finance_tracker TO authenticated;
GRANT ALL ON public.finance_tracker TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.finance_tracker_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.finance_tracker_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.finance_tracker_id_seq TO service_role;

-- Success message
SELECT 'Finance Tracker Users table created successfully!' as message;
