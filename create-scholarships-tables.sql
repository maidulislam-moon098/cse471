-- Create scholarships table to store available scholarship programs
CREATE TABLE IF NOT EXISTS scholarships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  requirements TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  academic_year VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scholarship applications table to track student applications
CREATE TABLE IF NOT EXISTS scholarship_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scholarship_id UUID REFERENCES scholarships(id),
  user_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, under_review, approved, rejected
  gpa DECIMAL(3, 2),
  financial_info TEXT,
  statement_of_purpose TEXT,
  supporting_documents JSONB,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_user_id ON scholarship_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_status ON scholarship_applications(status);
