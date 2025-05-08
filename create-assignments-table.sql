-- Check if the assignments table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignments') THEN
        -- Create assignments table
        CREATE TABLE public.assignments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            course_id UUID NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            instructions TEXT,
            due_date TIMESTAMP WITH TIME ZONE NOT NULL,
            max_points INTEGER NOT NULL DEFAULT 100,
            file_url TEXT,
            file_name TEXT,
            file_type TEXT,
            file_size BIGINT,
            created_by UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        );

        -- Create index for faster lookups
        CREATE INDEX assignments_course_id_idx ON public.assignments(course_id);
        CREATE INDEX assignments_created_by_idx ON public.assignments(created_by);
        
        -- Enable Row Level Security
        ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Admins can do anything" ON public.assignments
            FOR ALL USING (
                (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
            );
            
        CREATE POLICY "Faculty can view assignments they created or for courses they teach" ON public.assignments
            FOR SELECT USING (
                (SELECT role FROM public.users WHERE id = auth.uid()) = 'faculty' AND (
                    created_by = auth.uid() OR 
                    course_id IN (
                        SELECT course_id FROM public.teaching_assignments 
                        WHERE user_id = auth.uid()
                    )
                )
            );
            
        CREATE POLICY "Faculty can insert assignments for courses they teach" ON public.assignments
            FOR INSERT WITH CHECK (
                (SELECT role FROM public.users WHERE id = auth.uid()) = 'faculty' AND
                course_id IN (
                    SELECT course_id FROM public.teaching_assignments 
                    WHERE user_id = auth.uid()
                )
            );
            
        CREATE POLICY "Faculty can update assignments they created" ON public.assignments
            FOR UPDATE USING (
                (SELECT role FROM public.users WHERE id = auth.uid()) = 'faculty' AND
                created_by = auth.uid()
            );
            
        CREATE POLICY "Students can view assignments for courses they are enrolled in" ON public.assignments
            FOR SELECT USING (
                (SELECT role FROM public.users WHERE id = auth.uid()) = 'student' AND
                course_id IN (
                    SELECT course_id FROM public.enrollments 
                    WHERE user_id = auth.uid()
                )
            );

        -- Create assignment_submissions table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignment_submissions') THEN
            CREATE TABLE public.assignment_submissions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                assignment_id UUID NOT NULL,
                user_id UUID NOT NULL,
                content TEXT,
                file_url TEXT,
                file_name TEXT,
                file_type TEXT,
                file_size BIGINT,
                status TEXT NOT NULL DEFAULT 'submitted',
                grade INTEGER,
                feedback TEXT,
                graded_by UUID,
                submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                graded_at TIMESTAMP WITH TIME ZONE,
                FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE(assignment_id, user_id)
            );

            -- Create indexes
            CREATE INDEX assignment_submissions_assignment_id_idx ON public.assignment_submissions(assignment_id);
            CREATE INDEX assignment_submissions_user_id_idx ON public.assignment_submissions(user_id);
            
            -- Enable Row Level Security
            ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
            
            -- Create policies
            CREATE POLICY "Admins can do anything" ON public.assignment_submissions
                FOR ALL USING (
                    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
                );
                
            CREATE POLICY "Faculty can view submissions for assignments of courses they teach" ON public.assignment_submissions
                FOR SELECT USING (
                    (SELECT role FROM public.users WHERE id = auth.uid()) = 'faculty' AND
                    assignment_id IN (
                        SELECT a.id FROM public.assignments a
                        JOIN public.teaching_assignments ta ON a.course_id = ta.course_id
                        WHERE ta.user_id = auth.uid()
                    )
                );
                
            CREATE POLICY "Faculty can update submissions to grade them" ON public.assignment_submissions
                FOR UPDATE USING (
                    (SELECT role FROM public.users WHERE id = auth.uid()) = 'faculty' AND
                    assignment_id IN (
                        SELECT a.id FROM public.assignments a
                        JOIN public.teaching_assignments ta ON a.course_id = ta.course_id
                        WHERE ta.user_id = auth.uid()
                    )
                );
                
            CREATE POLICY "Students can view their own submissions" ON public.assignment_submissions
                FOR SELECT USING (
                    (SELECT role FROM public.users WHERE id = auth.uid()) = 'student' AND
                    user_id = auth.uid()
                );
                
            CREATE POLICY "Students can submit assignments" ON public.assignment_submissions
                FOR INSERT WITH CHECK (
                    (SELECT role FROM public.users WHERE id = auth.uid()) = 'student' AND
                    user_id = auth.uid() AND
                    assignment_id IN (
                        SELECT a.id FROM public.assignments a
                        JOIN public.enrollments e ON a.course_id = e.course_id
                        WHERE e.user_id = auth.uid()
                    )
                );
                
            CREATE POLICY "Students can update their own submissions" ON public.assignment_submissions
                FOR UPDATE USING (
                    (SELECT role FROM public.users WHERE id = auth.uid()) = 'student' AND
                    user_id = auth.uid() AND
                    status != 'graded'
                );
        END IF;
    END IF;
END $$;
