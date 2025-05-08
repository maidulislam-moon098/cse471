-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_class_reminder BOOLEAN DEFAULT TRUE,
  email_announcements BOOLEAN DEFAULT TRUE,
  email_grade_updates BOOLEAN DEFAULT TRUE,
  email_assignment_updates BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add variables column to email_templates if it doesn't exist
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}';

-- Update existing templates to include variables information
UPDATE email_templates 
SET variables = '{"user_name": "User''s full name", "course_name": "Name of the course", "class_title": "Title of the class session", "minutes_until": "Minutes until class starts", "class_date": "Date of the class", "class_time": "Time of the class", "meeting_link": "Link to join the class"}'
WHERE id = 'class_reminder';

UPDATE email_templates 
SET variables = '{"user_name": "User''s full name", "announcement_title": "Title of the announcement", "announcement_content": "Content of the announcement", "sender_name": "Name of the sender"}'
WHERE id = 'announcement';

UPDATE email_templates 
SET variables = '{"user_name": "User''s full name", "reset_link": "Password reset link"}'
WHERE id = 'password_reset';

UPDATE email_templates 
SET variables = '{"user_name": "User''s full name", "user_email": "User''s email address", "user_role": "User''s role (Student/Faculty/Admin)", "verification_link": "Email verification link"}'
WHERE id = 'welcome';

UPDATE email_templates 
SET variables = '{"user_name": "User''s full name", "course_name": "Name of the course", "assignment_name": "Name of the assignment", "grade": "Grade received", "comments": "Optional comments from instructor"}'
WHERE id = 'grade_update';

-- Create email_logs table to track sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_id VARCHAR(50) REFERENCES email_templates(id),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  error_message TEXT
);
