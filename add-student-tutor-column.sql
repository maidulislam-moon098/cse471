-- Add student tutor status column to users table
ALTER TABLE IF EXISTS users
ADD COLUMN IF NOT EXISTS is_student_tutor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tutor_application_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tutor_application_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tutor_application_notes TEXT DEFAULT NULL;

-- Create a table to track tutor applications
CREATE TABLE IF NOT EXISTS tutor_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  application_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  review_date TIMESTAMP WITH TIME ZONE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
