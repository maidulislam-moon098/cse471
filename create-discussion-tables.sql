-- Create discussions table if it doesn't exist
CREATE TABLE IF NOT EXISTS discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_closed BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0
);

-- Create discussion comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS discussion_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_solution BOOLEAN DEFAULT FALSE
);

-- Create discussion upvotes table if it doesn't exist
CREATE TABLE IF NOT EXISTS discussion_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES discussion_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT upvote_target_check CHECK (
    (discussion_id IS NOT NULL AND comment_id IS NULL) OR
    (discussion_id IS NULL AND comment_id IS NOT NULL)
  ),
  CONSTRAINT unique_discussion_upvote UNIQUE (discussion_id, user_id),
  CONSTRAINT unique_comment_upvote UNIQUE (comment_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS discussions_course_id_idx ON discussions(course_id);
CREATE INDEX IF NOT EXISTS discussions_created_by_idx ON discussions(created_by);
CREATE INDEX IF NOT EXISTS discussion_comments_discussion_id_idx ON discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS discussion_comments_created_by_idx ON discussion_comments(created_by);
CREATE INDEX IF NOT EXISTS discussion_upvotes_discussion_id_idx ON discussion_upvotes(discussion_id);
CREATE INDEX IF NOT EXISTS discussion_upvotes_comment_id_idx ON discussion_upvotes(comment_id);
CREATE INDEX IF NOT EXISTS discussion_upvotes_user_id_idx ON discussion_upvotes(user_id);

-- Add RLS policies
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_upvotes ENABLE ROW LEVEL SECURITY;

-- Policies for discussions

-- Admin policies (full access)
CREATE POLICY admin_discussions_policy ON discussions
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Faculty policies
CREATE POLICY faculty_view_discussions_policy ON discussions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teaching_assignments ta ON ta.user_id = u.id
      WHERE u.id = auth.uid() 
      AND u.role = 'faculty'
      AND ta.course_id = discussions.course_id
    )
  );

CREATE POLICY faculty_modify_discussions_policy ON discussions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN teaching_assignments ta ON ta.user_id = u.id
      WHERE u.id = auth.uid() 
      AND u.role = 'faculty'
      AND ta.course_id = discussions.course_id
    )
  );

-- Student policies
CREATE POLICY student_view_discussions_policy ON discussions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN enrollments e ON e.user_id = u.id
      WHERE u.id = auth.uid() 
      AND u.role = 'student'
      AND e.course_id = discussions.course_id
    )
  );

CREATE POLICY student_create_discussions_policy ON discussions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN enrollments e ON e.user_id = u.id
      WHERE u.id = auth.uid() 
      AND u.role = 'student'
      AND e.course_id = discussions.course_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY student_update_own_discussions_policy ON discussions
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'student'
    )
  );

-- Similar policies for discussion_comments and discussion_upvotes
-- (Omitted for brevity but follow the same pattern)
