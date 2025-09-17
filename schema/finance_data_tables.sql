-- PostgreSQL tables for storing finance data (Incomes, Expenses, Budgets)
-- This migrates data structure from Google Sheets to PostgreSQL database
-- Run this after the main finance_tracker table exists

-- =============================================================================
-- 1. INCOMES TABLE
-- =============================================================================

-- Table for storing income records
CREATE TABLE IF NOT EXISTS incomes (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Foreign key to link to user
    user_id BIGINT NOT NULL REFERENCES finance_tracker(id) ON DELETE CASCADE,
    
    -- Income data fields (matching Google Sheets structure)
    timestamp VARCHAR(255), -- Original timestamp from Google Sheets
    date DATE NOT NULL, -- Parsed date for queries and sorting
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    category VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'manual' NOT NULL, -- 'manual', 'imported', 'api'
    external_id VARCHAR(255), -- For tracking imports/syncing
    
    CONSTRAINT incomes_user_date_amount_category_unique 
        UNIQUE (user_id, date, amount, category)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON incomes(user_id, date);
CREATE INDEX IF NOT EXISTS idx_incomes_category ON incomes(category);
CREATE INDEX IF NOT EXISTS idx_incomes_amount ON incomes(amount);

-- Comments
COMMENT ON TABLE incomes IS 'Table storing user income records migrated from Google Sheets';
COMMENT ON COLUMN incomes.user_id IS 'Foreign key reference to finance_tracker table';
COMMENT ON COLUMN incomes.timestamp IS 'Original timestamp string from Google Sheets';
COMMENT ON COLUMN incomes.date IS 'Parsed date for querying and filtering';
COMMENT ON COLUMN incomes.amount IS 'Income amount with 2 decimal precision';
COMMENT ON COLUMN incomes.external_id IS 'For tracking data imports and synchronization';

-- =============================================================================
-- 2. EXPENSES TABLE
-- =============================================================================

-- Table for storing expense records
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Foreign key to link to user
    user_id BIGINT NOT NULL REFERENCES finance_tracker(id) ON DELETE CASCADE,
    
    -- Expense data fields (matching Google Sheets structure)
    timestamp VARCHAR(255), -- Original timestamp from Google Sheets
    date DATE NOT NULL, -- Parsed date for queries and sorting
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    category VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'manual' NOT NULL, -- 'manual', 'imported', 'api'
    external_id VARCHAR(255), -- For tracking imports/syncing
    
    CONSTRAINT expenses_user_date_amount_category_unique 
        UNIQUE (user_id, date, amount, category)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON expenses(amount);

-- Comments
COMMENT ON TABLE expenses IS 'Table storing user expense records migrated from Google Sheets';
COMMENT ON COLUMN expenses.user_id IS 'Foreign key reference to finance_tracker table';
COMMENT ON COLUMN expenses.timestamp IS 'Original timestamp string from Google Sheets';
COMMENT ON COLUMN expenses.date IS 'Parsed date for querying and filtering';
COMMENT ON COLUMN expenses.amount IS 'Expense amount with 2 decimal precision';
COMMENT ON COLUMN expenses.external_id IS 'For tracking data imports and synchronization';

-- =============================================================================
-- 3. BUDGETS TABLE
-- =============================================================================

-- Table for storing budget records
CREATE TABLE IF NOT EXISTS budgets (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Foreign key to link to user
    user_id BIGINT NOT NULL REFERENCES finance_tracker(id) ON DELETE CASCADE,
    
    -- Budget data fields (matching Google Sheets structure)
    timestamp VARCHAR(255), -- Original timestamp from Google Sheets
    date DATE NOT NULL, -- Parsed date for queries and sorting
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    notes TEXT,
    
    -- Additional budget fields
    budget_type VARCHAR(50) DEFAULT 'monthly' NOT NULL, -- 'monthly', 'weekly', 'yearly', 'custom'
    period_start DATE, -- Start of budget period
    period_end DATE, -- End of budget period
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'manual' NOT NULL, -- 'manual', 'imported', 'api'
    external_id VARCHAR(255), -- For tracking imports/syncing
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    CONSTRAINT budgets_user_date_unique UNIQUE (user_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_date ON budgets(date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_date ON budgets(user_id, date);
CREATE INDEX IF NOT EXISTS idx_budgets_is_active ON budgets(is_active);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_start, period_end);

-- Comments
COMMENT ON TABLE budgets IS 'Table storing user budget records migrated from Google Sheets';
COMMENT ON COLUMN budgets.user_id IS 'Foreign key reference to finance_tracker table';
COMMENT ON COLUMN budgets.timestamp IS 'Original timestamp string from Google Sheets';
COMMENT ON COLUMN budgets.date IS 'Date when budget was set';
COMMENT ON COLUMN budgets.amount IS 'Budget amount with 2 decimal precision';
COMMENT ON COLUMN budgets.budget_type IS 'Type of budget period (monthly, weekly, yearly, custom)';
COMMENT ON COLUMN budgets.external_id IS 'For tracking data imports and synchronization';

-- =============================================================================
-- 4. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =============================================================================

-- Ensure the update function exists (it should from the main finance_tracker table)
-- If not, create it:
CREATE OR REPLACE FUNCTION update_finance_tracker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for automatic updated_at timestamp updates
CREATE TRIGGER trigger_update_incomes_updated_at
    BEFORE UPDATE ON incomes
    FOR EACH ROW
    EXECUTE FUNCTION update_finance_tracker_updated_at();

CREATE TRIGGER trigger_update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_finance_tracker_updated_at();

CREATE TRIGGER trigger_update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_finance_tracker_updated_at();

-- =============================================================================
-- 5. SAMPLE QUERIES FOR VERIFICATION
-- =============================================================================

-- Uncomment these queries to test the tables after creation:

-- View table structures
-- \d incomes;
-- \d expenses;
-- \d budgets;

-- Check constraints and indexes
-- SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name IN ('incomes', 'expenses', 'budgets');
-- SELECT indexname, tablename FROM pg_indexes WHERE tablename IN ('incomes', 'expenses', 'budgets');

-- Test foreign key relationships
-- SELECT 
--     tc.table_name, 
--     kcu.column_name, 
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('incomes', 'expenses', 'budgets');
