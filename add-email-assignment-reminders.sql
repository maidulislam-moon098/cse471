-- Add email_assignment_reminders column to notification_settings table if it doesn't exist
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS email_assignment_reminders BOOLEAN DEFAULT TRUE;
