-- This SQL script can be used to check and fix any issues with the complaints table

-- Check if the complaints table exists and has the correct structure
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'complaints'
);

-- Check the structure of the complaints table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'complaints';

-- Check if there are any complaints in the table
SELECT COUNT(*) FROM complaints;

-- Check if there are any complaints with missing user_id
SELECT COUNT(*) FROM complaints WHERE user_id IS NULL;

-- Check if all user_ids in complaints exist in the users table
SELECT c.id, c.user_id 
FROM complaints c
LEFT JOIN users u ON c.user_id = u.id
WHERE u.id IS NULL;

-- Add an index on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'complaints' 
    AND indexname = 'complaints_user_id_idx'
  ) THEN
    CREATE INDEX complaints_user_id_idx ON complaints(user_id);
  END IF;
END
$$;
