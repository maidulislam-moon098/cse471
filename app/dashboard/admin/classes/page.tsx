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

export default function ManageClasses() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [message, setMessage] = useState({ text: "", type: "" })
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)

        const { data, error } = await supabase
          .from("class_sessions")
          .select("*")
          .order("start_time", { ascending: true })

        if (error) throw error

        if (data) {
          // Fetch course details for each session
          const sessionsWithCourseDetails = await Promise.all(
            data.map(async (session) => {
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
        console.error("Error fetching classes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [user])

  const handleDeleteClass = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this class session? This action cannot be undone.")) {
      return
    }

    try {
      // Delete class session
      const { error } = await supabase.from("class_sessions").delete().eq("id", sessionId)

      if (error) throw error

      // Update local state
      setSessions(sessions.filter((s) => s.id !== sessionId))
      setMessage({ text: "Class session deleted successfully", type: "success" })
    } catch (error: any) {
      console.error("Error deleting class session:", error)
      setMessage({ text: error.message || "Failed to delete class session", type: "error" })
    }
  }

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
      (session.course_title && session.course_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (session.description && session.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Manage Classes</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Manage Classes</h1>
          <p className="mt-1 text-gray-400">View, edit, and remove scheduled classes</p>
        </div>
        <Link href="/dashboard/admin/classes/create" className="btn-primary">
          Schedule New Class
        </Link>
      </div>

      {message.text && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search classes..."
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
                      {session.description && <p className="text-gray-300 mt-1">{session.description}</p>}
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
                      {session.meeting_link && (
                        <div className="mt-1 flex items-center text-gray-300">
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
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.102 1.101"
                            />
                          </svg>
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-500 hover:text-purple-400"
                          >
                            Meeting Link
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 md:mt-0 flex space-x-3">
                      <Link
                        href={`/dashboard/admin/classes/edit/${session.id}`}
                        className="text-purple-500 hover:text-purple-400"
                      >
                        Edit
                      </Link>
                      <button onClick={() => handleDeleteClass(session.id)} className="text-red-500 hover:text-red-400">
                        Delete
                      </button>
                      <Link
                        href={`/dashboard/admin/classes/attendance/${session.id}`}
                        className="text-blue-500 hover:text-blue-400"
                      >
                        Attendance
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
                <p className="text-gray-400">
                  {searchTerm
                    ? "No classes found matching your search criteria."
                    : "No classes have been scheduled yet."}
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
