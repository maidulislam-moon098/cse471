-- Check the structure of the class_sessions table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'class_sessions';
