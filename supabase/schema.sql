-- Grocery List App Schema for Supabase

-- Staple items: things you always want on your grocery list (fruits, protein bars, etc.)
CREATE TABLE staples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pantry items: things you always have on hand (salt, olive oil, etc.)
-- These get filtered OUT from recipe ingredients
CREATE TABLE pantry_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    needs_restock BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorite recipes: tracks which Notion recipes are favorites for weekly suggestions
CREATE TABLE favorite_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notion_page_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    times_made INTEGER DEFAULT 0,
    last_made DATE,
    is_favorite BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly lists: the main grocery list for each week
CREATE TABLE weekly_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start DATE NOT NULL UNIQUE,  -- Sunday of the week
    status VARCHAR(50) DEFAULT 'draft',  -- draft, active, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly list items: individual items on a weekly list
CREATE TABLE weekly_list_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    weekly_list_id UUID REFERENCES weekly_lists(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity VARCHAR(100),
    checked BOOLEAN DEFAULT false,
    source VARCHAR(50),  -- 'staple', 'recipe', 'manual'
    source_recipe_id VARCHAR(255),  -- Notion page ID if from recipe
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly recipe selections: recipes chosen for a given week
CREATE TABLE weekly_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    weekly_list_id UUID REFERENCES weekly_lists(id) ON DELETE CASCADE,
    notion_page_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'suggested',  -- suggested, accepted, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning: Recipe preference scores (updated weekly based on user behavior)
CREATE TABLE recipe_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notion_page_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    acceptance_rate DECIMAL(3,2) DEFAULT 0.5,  -- 0-1 scale
    times_suggested INTEGER DEFAULT 0,
    times_accepted INTEGER DEFAULT 0,
    times_rejected INTEGER DEFAULT 0,
    last_suggested DATE,
    last_accepted DATE,
    score DECIMAL(5,2) DEFAULT 50.0,  -- Computed preference score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning: Item purchase patterns
CREATE TABLE item_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    times_added INTEGER DEFAULT 0,
    times_purchased INTEGER DEFAULT 0,  -- checked off
    times_skipped INTEGER DEFAULT 0,    -- not checked off
    purchase_rate DECIMAL(3,2) DEFAULT 0.5,
    last_purchased DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning: Weekly analysis results (what the system learned each week)
CREATE TABLE weekly_learnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start DATE NOT NULL,
    recipes_suggested INTEGER DEFAULT 0,
    recipes_accepted INTEGER DEFAULT 0,
    recipes_rejected INTEGER DEFAULT 0,
    items_total INTEGER DEFAULT 0,
    items_purchased INTEGER DEFAULT 0,
    items_skipped INTEGER DEFAULT 0,
    insights JSONB,  -- Store learned patterns as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings: stores user preferences including schedule
CREATE TABLE user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default schedule (Sunday at 9 AM)
INSERT INTO user_settings (setting_key, setting_value) VALUES
    ('suggestion_schedule', '{"day": 0, "hour": 9, "minute": 0}');

-- Insert default staples
INSERT INTO staples (name, category, active) VALUES
    ('Bananas', 'Fruits', true),
    ('Apples', 'Fruits', true),
    ('Blueberries', 'Fruits', true),
    ('Strawberries', 'Fruits', true),
    ('Bare Bell Protein Bars', 'Snacks', true),
    ('Milk', 'Dairy', true),
    ('Eggs', 'Dairy', true),
    ('Bread', 'Bakery', true),
    ('Greek Yogurt', 'Dairy', true);

-- Insert default pantry items
INSERT INTO pantry_items (name, category) VALUES
    ('Salt', 'Spices'),
    ('Black Pepper', 'Spices'),
    ('Olive Oil', 'Oils'),
    ('Vegetable Oil', 'Oils'),
    ('Garlic Powder', 'Spices'),
    ('Onion Powder', 'Spices'),
    ('Paprika', 'Spices'),
    ('Cumin', 'Spices'),
    ('Oregano', 'Spices'),
    ('Basil', 'Spices'),
    ('Italian Seasoning', 'Spices'),
    ('Red Pepper Flakes', 'Spices'),
    ('Sugar', 'Baking'),
    ('Brown Sugar', 'Baking'),
    ('All-Purpose Flour', 'Baking'),
    ('Baking Powder', 'Baking'),
    ('Baking Soda', 'Baking'),
    ('Vanilla Extract', 'Baking'),
    ('Soy Sauce', 'Condiments'),
    ('Rice Vinegar', 'Condiments'),
    ('Apple Cider Vinegar', 'Condiments'),
    ('Honey', 'Condiments'),
    ('Mustard', 'Condiments'),
    ('Ketchup', 'Condiments'),
    ('Mayonnaise', 'Condiments');

-- Create indexes for better query performance
CREATE INDEX idx_weekly_lists_week_start ON weekly_lists(week_start);
CREATE INDEX idx_weekly_list_items_list_id ON weekly_list_items(weekly_list_id);
CREATE INDEX idx_weekly_recipes_list_id ON weekly_recipes(weekly_list_id);
CREATE INDEX idx_staples_active ON staples(active);

-- Enable Row Level Security (optional, for multi-user support later)
ALTER TABLE staples ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_recipes ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (single user app)
CREATE POLICY "Allow all" ON staples FOR ALL USING (true);
CREATE POLICY "Allow all" ON pantry_items FOR ALL USING (true);
CREATE POLICY "Allow all" ON favorite_recipes FOR ALL USING (true);
CREATE POLICY "Allow all" ON weekly_lists FOR ALL USING (true);
CREATE POLICY "Allow all" ON weekly_list_items FOR ALL USING (true);
CREATE POLICY "Allow all" ON weekly_recipes FOR ALL USING (true);
