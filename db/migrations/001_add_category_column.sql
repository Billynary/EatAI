-- Add category column to food_inventory table
ALTER TABLE food_inventory 
ADD COLUMN category VARCHAR(100);

-- Update existing records to have a default category if needed (optional)
-- UPDATE food_inventory SET category = 'Uncategorized' WHERE category IS NULL;