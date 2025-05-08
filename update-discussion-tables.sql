-- First, check if the discussion_comments table exists and has the comment_id column
DO $$
BEGIN
    -- Check if discussion_comments table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'discussion_comments') THEN
        -- Create the discussion_comments table
        CREATE TABLE public.discussion_comments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            discussion_id UUID NOT NULL,
            user_id UUID NOT NULL,
            content TEXT NOT NULL,
            is_solution BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
        );
    ELSE
        -- Add is_solution column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.discussion_comments'::regclass AND attname = 'is_solution') THEN
            ALTER TABLE public.discussion_comments ADD COLUMN is_solution BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
    
    -- Check if discussions table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'discussions') THEN
        -- Create the discussions table
        CREATE TABLE public.discussions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            user_id UUID NOT NULL,
            course_id UUID NOT NULL,
            view_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
        );
    ELSE
        -- Add view_count column if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.discussions'::regclass AND attname = 'view_count') THEN
            ALTER TABLE public.discussions ADD COLUMN view_count INTEGER DEFAULT 0;
        END IF;
    END IF;
    
    -- Check if discussion_upvotes table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'discussion_upvotes') THEN
        -- Create the discussion_upvotes table
        CREATE TABLE public.discussion_upvotes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            discussion_id UUID,
            comment_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
            FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE,
            FOREIGN KEY (comment_id) REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
            CONSTRAINT upvote_target_check CHECK (
                (discussion_id IS NOT NULL AND comment_id IS NULL) OR
                (discussion_id IS NULL AND comment_id IS NOT NULL)
            )
        );
        
        -- Create unique constraint to prevent duplicate upvotes
        CREATE UNIQUE INDEX discussion_upvotes_user_discussion_idx ON discussion_upvotes (user_id, discussion_id) 
            WHERE discussion_id IS NOT NULL;
        CREATE UNIQUE INDEX discussion_upvotes_user_comment_idx ON discussion_upvotes (user_id, comment_id) 
            WHERE comment_id IS NOT NULL;
    END IF;
    
    -- Create indexes for better performance if they don't exist
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'discussion_upvotes_discussion_id_idx') THEN
        CREATE INDEX discussion_upvotes_discussion_id_idx ON public.discussion_upvotes(discussion_id) 
            WHERE discussion_id IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'discussion_upvotes_comment_id_idx') THEN
        CREATE INDEX discussion_upvotes_comment_id_idx ON public.discussion_upvotes(comment_id) 
            WHERE comment_id IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'discussion_upvotes_user_id_idx') THEN
        CREATE INDEX discussion_upvotes_user_id_idx ON public.discussion_upvotes(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'discussion_comments_discussion_id_idx') THEN
        CREATE INDEX discussion_comments_discussion_id_idx ON public.discussion_comments(discussion_id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'discussions_course_id_idx') THEN
        CREATE INDEX discussions_course_id_idx ON public.discussions(course_id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'discussions_user_id_idx') THEN
        CREATE INDEX discussions_user_id_idx ON public.discussions(user_id);
    END IF;
END $$;

-- Enable RLS on all discussion tables
ALTER TABLE IF EXISTS public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discussion_upvotes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for discussions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussions' AND policyname = 'discussions_select_policy') THEN
        CREATE POLICY discussions_select_policy ON discussions
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussions' AND policyname = 'discussions_insert_policy') THEN
        CREATE POLICY discussions_insert_policy ON discussions
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussions' AND policyname = 'discussions_update_policy') THEN
        CREATE POLICY discussions_update_policy ON discussions
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'faculty')));
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussions' AND policyname = 'discussions_delete_policy') THEN
        CREATE POLICY discussions_delete_policy ON discussions
            FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin')));
    END IF;
END $$;

-- Create RLS policies for discussion_comments
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussion_comments' AND policyname = 'discussion_comments_select_policy') THEN
        CREATE POLICY discussion_comments_select_policy ON discussion_comments
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussion_comments' AND policyname = 'discussion_comments_insert_policy') THEN
        CREATE POLICY discussion_comments_insert_policy ON discussion_comments
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussion_comments' AND policyname = 'discussion_comments_update_policy') THEN
        CREATE POLICY discussion_comments_update_policy ON discussion_comments
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'faculty')));
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussion_comments' AND policyname = 'discussion_comments_delete_policy') THEN
        CREATE POLICY discussion_comments_delete_policy ON discussion_comments
            FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin')));
    END IF;
END $$;

-- Create RLS policies for discussion_upvotes
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussion_upvotes' AND policyname = 'discussion_upvotes_select_policy') THEN
        CREATE POLICY discussion_upvotes_select_policy ON discussion_upvotes
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussion_upvotes' AND policyname = 'discussion_upvotes_insert_policy') THEN
        CREATE POLICY discussion_upvotes_insert_policy ON discussion_upvotes
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussion_upvotes' AND policyname = 'discussion_upvotes_update_policy') THEN
        CREATE POLICY discussion_upvotes_update_policy ON discussion_upvotes
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'discussion_upvotes' AND policyname = 'discussion_upvotes_delete_policy') THEN
        CREATE POLICY discussion_upvotes_delete_policy ON discussion_upvotes
            FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Update the schema cache
COMMENT ON TABLE public.discussions IS 'Table for storing course discussions';
COMMENT ON TABLE public.discussion_comments IS 'Table for storing comments on discussions';
COMMENT ON TABLE public.discussion_upvotes IS 'Table for storing upvotes on discussions and comments';
