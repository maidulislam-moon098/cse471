-- Check if class_sessions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'class_sessions'
);

-- Check the structure of class_sessions table if it exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'class_sessions';
