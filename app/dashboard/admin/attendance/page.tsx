"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"] & {
  course_code?: string
  course_title?: string
}

export default function AttendanceReports() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)

        // Get all sessions with course details
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("class_sessions")
          .select("*")
          .order("start_time", { ascending: false })
          .limit(50) // Limit to recent 50 sessions

        if (sessionsError) throw sessionsError

        if (sessionsData) {
          // Fetch course details for each session
          const sessionsWithCourseDetails = await Promise.all(
            sessionsData.map(async (session) => {
              const { data: courseData, error: courseError } = await supabase
                .from("courses")
                .select("code, title")
                .eq("id", session.course_id)
                .single()

              if (courseError) {
                return {
                  ...session,
                  course_code: "Unknown",
                  course_title: "Unknown Course",
                }
              }

              return {
                ...session,
                course_code: courseData.code,
                course_title: courseData.title,
              }
            }),
          )

          setSessions(sessionsWithCourseDetails)
        }
      } catch (error) {
        console.error("Error fetching sessions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [user])

  // Format date for display
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (session.course_code && session.course_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (session.course_title && session.course_title.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Attendance Reports</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Attendance Reports</h1>
      <p className="mt-1 text-gray-400">View attendance records for all class sessions</p>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search sessions..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center mt-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <div key={session.id} className="bg-card p-4 rounded-lg border border-gray-800 hover:border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white">{session.title}</h3>
                      <p className="text-gray-400">
                        {session.course_code} - {session.course_title}
                      </p>
                      <div className="mt-2 flex items-center text-gray-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>
                          {formatDateTime(session.start_time)} - {formatDateTime(session.end_time)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0">
                      <Link
                        href={`/dashboard/admin/classes/attendance/${session.id}`}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
                      >
                        View Attendance
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
                <p className="text-gray-400">
                  {searchTerm
                    ? "No sessions found matching your search criteria."
                    : "No class sessions have been scheduled yet."}
                </p>
                <Link href="/dashboard/admin/classes/create" className="btn-primary inline-block mt-4">
                  Schedule a Class
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
