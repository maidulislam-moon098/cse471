-- Check if assignments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'assignments'
);

-- Check the structure of assignments table if it exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'assignments';

-- Check for any assignments in the database
SELECT id, course_id, title, due_date, created_by
FROM assignments
LIMIT 10;
