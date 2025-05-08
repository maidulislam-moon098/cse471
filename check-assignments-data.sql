-- Check if assignments exist in the database
SELECT * FROM assignments ORDER BY created_at DESC LIMIT 10;

-- Check if there are any constraints or triggers that might be affecting inserts
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM 
    pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class cl ON cl.oid = c.conrelid
WHERE 
    n.nspname = 'public' 
    AND cl.relname = 'assignments';

-- Check permissions on the assignments table
SELECT 
    grantee, 
    table_name, 
    privilege_type
FROM 
    information_schema.role_table_grants
WHERE 
    table_name = 'assignments';
