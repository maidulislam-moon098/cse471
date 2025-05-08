-- Add reminder_sent column to class_sessions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'class_sessions' 
        AND column_name = 'reminder_sent'
    ) THEN
        ALTER TABLE class_sessions ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
