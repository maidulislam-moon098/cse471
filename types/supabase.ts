export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: "student" | "faculty" | "admin"
          phone: string | null
          department: string | null
          bio: string | null
          created_at: string
          updated_at: string
          is_verified: boolean
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: "student" | "faculty" | "admin"
          phone?: string | null
          department?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          is_verified?: boolean
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: "student" | "faculty" | "admin"
          phone?: string | null
          department?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          is_verified?: boolean
        }
      }
      courses: {
        Row: {
          id: string
          code: string
          title: string
          description: string | null
          credits: number
          room: string | null
          schedule: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          title: string
          description?: string | null
          credits: number
          room?: string | null
          schedule?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          title?: string
          description?: string | null
          credits?: number
          room?: string | null
          schedule?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          created_at?: string
        }
      }
      teaching_assignments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          created_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          course_id: string
          title: string
          content: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          content?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deadlines: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          due_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          due_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          due_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      class_sessions: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          meeting_link: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          reminder_sent: boolean
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          meeting_link?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          reminder_sent?: boolean
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          meeting_link?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          reminder_sent?: boolean
        }
      }
      attendance: {
        Row: {
          id: string
          user_id: string
          session_id: string
          join_time: string | null
          leave_time: string | null
          duration_minutes: number | null
          is_present: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          join_time?: string | null
          leave_time?: string | null
          duration_minutes?: number | null
          is_present?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          join_time?: string | null
          leave_time?: string | null
          duration_minutes?: number | null
          is_present?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          due_date: string
          points_possible: number
          created_at: string
          updated_at: string
          created_by: string
          attachment_url: string | null
          submission_type: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          due_date: string
          points_possible: number
          created_at?: string
          updated_at?: string
          created_by: string
          attachment_url?: string | null
          submission_type: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          due_date?: string
          points_possible?: number
          created_at?: string
          updated_at?: string
          created_by?: string
          attachment_url?: string | null
          submission_type?: string
        }
      }
      assignment_submissions: {
        Row: {
          id: string
          assignment_id: string
          user_id: string
          submission_text: string | null
          submission_url: string | null
          submitted_at: string
          grade: number | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
        }
        Insert: {
          id?: string
          assignment_id: string
          user_id: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
          grade?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
        }
        Update: {
          id?: string
          assignment_id?: string
          user_id?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
          grade?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
        }
      }
      study_materials: {
        Row: {
          id: string
          title: string
          description: string | null
          course_id: string
          file_path: string
          file_url: string
          file_name: string
          file_type: string | null
          file_size: number | null
          uploaded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          course_id: string
          file_path: string
          file_url: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          uploaded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          course_id?: string
          file_path?: string
          file_url?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          uploaded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
