"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"]
type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function Classes() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<(ClassSession & { course_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
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
      if (!user) return

      try {
        setLoading(true)

        let courseIds: string[] = []

        if (user.role === "student") {
          // Fetch enrolled courses for students
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("user_id", user.id)

          if (enrollmentsError) throw enrollmentsError

          if (enrollments && enrollments.length > 0) {
            courseIds = enrollments.map((e) => e.course_id)
          }
        } else if (user.role === "faculty") {
          // Fetch teaching assignments for faculty
          const { data: assignments, error: assignmentsError } = await supabase
            .from("teaching_assignments")
            .select("course_id")
            .eq("user_id", user.id)

          if (assignmentsError) throw assignmentsError

          if (assignments && assignments.length > 0) {
            courseIds = assignments.map((a) => a.course_id)
          }
        } else if (user.role === "admin") {
          // Admins can see all sessions
          const { data: courses, error: coursesError } = await supabase.from("courses").select("id")

          if (coursesError) throw coursesError

          if (courses && courses.length > 0) {
            courseIds = courses.map((c) => c.id)
          }
        }

        if (courseIds.length > 0) {
          // Fetch upcoming class sessions
          const now = new Date().toISOString()
          const { data: sessionsData, error: sessionsError } = await supabase
            .from("class_sessions")
            .select("*")
            .in("course_id", courseIds)
            .gte("end_time", now) // Include ongoing and future sessions
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
        }
      } catch (error) {
        console.error("Error fetching classes data:", error)
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
    if (!user || !meetingLink) return

    try {
      // Record attendance when joining (if student)
      if (user.role === "student") {
        const recordAttendance = async (sessionId: string) => {
          const joinTime = new Date().toISOString()

          // Check if attendance record already exists
          const { data: existingRecord, error: checkError } = await supabase
            .from("attendance")
            .select("id")
            .eq("user_id", user.id)
            .eq("session_id", sessionId)
            .single()

          if (checkError && checkError.code !== "PGRST116") {
            console.error("Error checking attendance:", checkError)
          }

          if (existingRecord) {
            // Update existing record
            await supabase
              .from("attendance")
              .update({
                join_time: joinTime,
              })
              .eq("id", existingRecord.id)
          } else {
            // Create new attendance record
            await supabase.from("attendance").insert({
              user_id: user.id,
              session_id: sessionId,
              join_time: joinTime,
              is_present: true,
            })
          }
        }

        // Find the session ID for this meeting link
        const session = sessions.find((s) => s.meeting_link === meetingLink)
        if (session) {
          recordAttendance(session.id).catch((err) => {
            console.error("Failed to record attendance:", err)
          })
        }
      }

      // Open meeting link in new tab
      window.open(meetingLink, "_blank")
    } catch (error) {
      console.error("Error joining class:", error)
    }
  }

  // Check if user can join the class (in session or within 10 minutes of start)
  const canJoinClass = (startTime: string, endTime: string) => {
    return isClassInSession(startTime, endTime) || isClassAboutToStart(startTime)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Upcoming Classes</h1>
      <p className="mt-1 text-gray-400">View and join your scheduled online classes</p>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                className="bg-card p-6 rounded-lg border border-gray-800 hover:border-purple-600 transition-colors"
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

                    {(user?.role === "student" || user?.role === "faculty") && (
                      <button
                        onClick={() => handleJoinClass(session.meeting_link)}
                        disabled={!canJoinClass(session.start_time, session.end_time) || !session.meeting_link}
                        className={`mt-3 px-4 py-2 rounded-md font-medium ${
                          canJoinClass(session.start_time, session.end_time) && session.meeting_link
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "bg-gray-800 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {isClassInSession(session.start_time, session.end_time)
                          ? "Join Now"
                          : isClassAboutToStart(session.start_time)
                            ? "Join Soon"
                            : "Class Not Started"}
                      </button>
                    )}

                    {!canJoinClass(session.start_time, session.end_time) && (
                      <p className="mt-2 text-xs text-gray-400">
                        Join button will be enabled 10 minutes before class starts
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
              <p className="text-gray-400">No upcoming classes scheduled.</p>
              {user?.role === "faculty" && (
                <div className="mt-4">
                  <p className="text-gray-400 mb-2">As a faculty member, you can schedule classes for your courses.</p>
                  <a href="/dashboard/faculty/classes/create" className="btn-primary inline-block">
                    Schedule a Class
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
