-- Add the missing reminder_time_minutes column if it doesn't exist
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS reminder_time_minutes INTEGER DEFAULT 60;

-- Fix column name inconsistencies (if needed)
-- Check if we need to rename email_class_reminder to email_class_reminders
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_settings'
        AND column_name = 'email_class_reminder'
    ) THEN
        ALTER TABLE notification_settings 
        RENAME COLUMN email_class_reminder TO email_class_reminders;
    END IF;
END $$;
