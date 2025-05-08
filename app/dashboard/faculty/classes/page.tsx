"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"]
type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function FacultyClasses() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<(ClassSession & { course_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [message, setMessage] = useState({ text: "", type: "" })
  const supabase = getSupabaseBrowserClient()

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "faculty") return

      try {
        setLoading(true)

        // Fetch courses that the faculty teaches
        const { data: teachingAssignments, error: assignmentsError } = await supabase
          .from("teaching_assignments")
          .select("course_id")
          .eq("user_id", user.id)

        if (assignmentsError) throw assignmentsError

        if (!teachingAssignments || teachingAssignments.length === 0) {
          setLoading(false)
          return
        }

        const courseIds = teachingAssignments.map((assignment) => assignment.course_id)

        // Fetch class sessions for these courses
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("class_sessions")
          .select("*")
          .in("course_id", courseIds)
          .order("start_time", { ascending: true })

        if (sessionsError) throw sessionsError

        if (sessionsData && sessionsData.length > 0) {
          // Fetch course details for each session
          const sessionsWithCourseNames = await Promise.all(
            sessionsData.map(async (session) => {
              const { data: courseData, error: courseError } = await supabase
                .from("courses")
                .select("code, title")
                .eq("id", session.course_id)
                .single()

              if (courseError) {
                return {
                  ...session,
                  course_name: "Unknown Course",
                }
              }

              return {
                ...session,
                course_name: `${courseData.code} - ${courseData.title}`,
              }
            }),
          )

          setSessions(sessionsWithCourseNames)
        }
      } catch (error) {
        console.error("Error fetching classes data:", error)
        setMessage({ text: "Failed to load classes. Please refresh the page.", type: "error" })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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

  // Check if a class is currently in session
  const isClassInSession = (startTime: string, endTime: string) => {
    const now = currentTime
    const start = new Date(startTime)
    const end = new Date(endTime)
    return now >= start && now <= end
  }

  // Check if a class is about to start (within 10 minutes)
  const isClassAboutToStart = (startTime: string) => {
    const now = currentTime
    const start = new Date(startTime)
    const diffMs = start.getTime() - now.getTime()
    const diffMins = diffMs / 60000 // Convert ms to minutes

    return diffMins <= 10 && diffMins > 0
  }

  // Calculate time until class starts
  const getTimeUntilClass = (startTime: string) => {
    const now = currentTime
    const start = new Date(startTime)
    const diffMs = start.getTime() - now.getTime()

    if (diffMs < 0) return "In progress"

    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `Starts in ${diffMins} min`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Starts in ${diffHours} hr`

    const diffDays = Math.floor(diffHours / 24)
    return `Starts in ${diffDays} day${diffDays > 1 ? "s" : ""}`
  }

  // Get countdown timer for class about to start
  const getCountdownTimer = (startTime: string) => {
    const now = currentTime
    const start = new Date(startTime)
    const diffMs = start.getTime() - now.getTime()

    if (diffMs <= 0) return "00:00"

    const diffMins = Math.floor(diffMs / 60000)
    const diffSecs = Math.floor((diffMs % 60000) / 1000)

    return `${String(diffMins).padStart(2, "0")}:${String(diffSecs).padStart(2, "0")}`
  }

  // Handle joining a class
  const handleJoinClass = (meetingLink: string | null) => {
    if (!meetingLink) return
    window.open(meetingLink, "_blank")
  }

  // Check if user can join the class (in session or within 10 minutes of start)
  const canJoinClass = (startTime: string, endTime: string) => {
    return isClassInSession(startTime, endTime) || isClassAboutToStart(startTime)
  }

  // Handle deleting a class session
  const handleDeleteClass = async (sessionId: string) => {
    if (!confirm("Are you sure you want to cancel this class session?")) return

    try {
      const { error } = await supabase
        .from("class_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("created_by", user?.id || "")

      if (error) throw error

      // Update the UI by removing the deleted session
      setSessions(sessions.filter((session) => session.id !== sessionId))
      setMessage({ text: "Class session cancelled successfully", type: "success" })
    } catch (error) {
      console.error("Error deleting class session:", error)
      setMessage({ text: "Failed to cancel class session. Please try again.", type: "error" })
    }
  }

  if (user?.role !== "faculty") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Faculty Classes</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">My Classes</h1>
          <p className="mt-1 text-gray-400">Manage your scheduled online classes</p>
        </div>
        <Link
          href="/dashboard/faculty/classes/create"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium"
        >
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

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {sessions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-card p-6 rounded-lg border border-gray-800">
                  <h2 className="text-lg font-medium text-white mb-4">Upcoming Classes</h2>
                  <div className="space-y-4">
                    {sessions
                      .filter((session) => new Date(session.end_time) >= new Date())
                      .map((session) => (
                        <div
                          key={session.id}
                          className="p-4 rounded-lg border border-gray-700 hover:border-purple-600 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-white">{session.title}</h3>
                              <p className="text-gray-400">{session.course_name}</p>
                              {session.description && <p className="text-gray-300 mt-2">{session.description}</p>}
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
                            <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end">
                              {isClassInSession(session.start_time, session.end_time) ? (
                                <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-300">
                                  In Progress
                                </div>
                              ) : isClassAboutToStart(session.start_time) ? (
                                <div className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-900 text-yellow-300">
                                  Starting in {getCountdownTimer(session.start_time)}
                                </div>
                              ) : (
                                <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-gray-300">
                                  {getTimeUntilClass(session.start_time)}
                                </div>
                              )}

                              <div className="mt-3 flex space-x-2">
                                <button
                                  onClick={() => handleJoinClass(session.meeting_link)}
                                  disabled={
                                    !canJoinClass(session.start_time, session.end_time) || !session.meeting_link
                                  }
                                  className={`px-4 py-2 rounded-md font-medium ${
                                    canJoinClass(session.start_time, session.end_time) && session.meeting_link
                                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                                      : "bg-gray-800 text-gray-400 cursor-not-allowed"
                                  }`}
                                >
                                  {isClassInSession(session.start_time, session.end_time)
                                    ? "Join Now"
                                    : isClassAboutToStart(session.start_time)
                                      ? "Join Soon"
                                      : "Join"}
                                </button>

                                <button
                                  onClick={() => handleDeleteClass(session.id)}
                                  className="px-4 py-2 border border-red-800 text-red-400 hover:bg-red-900 hover:text-red-200 rounded-md font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-card p-6 rounded-lg border border-gray-800">
                  <h2 className="text-lg font-medium text-white mb-4">Past Classes</h2>
                  <div className="space-y-4">
                    {sessions
                      .filter((session) => new Date(session.end_time) < new Date())
                      .map((session) => (
                        <div key={session.id} className="p-4 rounded-lg border border-gray-700 opacity-70">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-white">{session.title}</h3>
                              <p className="text-gray-400">{session.course_name}</p>
                              {session.description && <p className="text-gray-300 mt-2">{session.description}</p>}
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
                              <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-gray-400">
                                Completed
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
              <p className="text-gray-400 mb-4">You haven't scheduled any classes yet.</p>
              <Link
                href="/dashboard/faculty/classes/create"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium"
              >
                Schedule Your First Class
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
