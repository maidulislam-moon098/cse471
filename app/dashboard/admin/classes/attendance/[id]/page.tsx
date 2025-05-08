"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"] & {
  course_code?: string
  course_title?: string
}

type AttendanceRecord = Database["public"]["Tables"]["attendance"]["Row"] & {
  user_name: string
  user_email: string
}

export default function ClassAttendance() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<ClassSession | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
  })
  const [message, setMessage] = useState({ text: "", type: "" })
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "admin" || !sessionId) return

      try {
        setLoading(true)

        // Fetch class session details
        const { data: sessionData, error: sessionError } = await supabase
          .from("class_sessions")
          .select("*")
          .eq("id", sessionId)
          .single()

        if (sessionError) throw sessionError

        if (sessionData) {
          // Fetch course details
          const { data: courseData, error: courseError } = await supabase
            .from("courses")
            .select("code, title")
            .eq("id", sessionData.course_id)
            .single()

          if (!courseError && courseData) {
            setSession({
              ...sessionData,
              course_code: courseData.code,
              course_title: courseData.title,
            })
          } else {
            setSession({
              ...sessionData,
              course_code: "Unknown",
              course_title: "Unknown Course",
            })
          }

          // Fetch enrolled students for this course
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from("enrollments")
            .select("user_id")
            .eq("course_id", sessionData.course_id)

          if (enrollmentsError) throw enrollmentsError

          if (enrollmentsData && enrollmentsData.length > 0) {
            const studentIds = enrollmentsData.map((e) => e.user_id)

            // Fetch attendance records for this session
            const { data: attendanceData, error: attendanceError } = await supabase
              .from("attendance")
              .select("*")
              .eq("session_id", sessionId)

            if (attendanceError) throw attendanceError

            // Create a map of existing attendance records
            const attendanceMap = new Map()
            if (attendanceData) {
              attendanceData.forEach((record) => {
                attendanceMap.set(record.user_id, record)
              })
            }

            // Fetch user details for all enrolled students
            const { data: studentsData, error: studentsError } = await supabase
              .from("users")
              .select("id, name, email")
              .in("id", studentIds)

            if (studentsError) throw studentsError

            if (studentsData) {
              // Create attendance records for all enrolled students
              const records: AttendanceRecord[] = studentsData.map((student) => {
                const existingRecord = attendanceMap.get(student.id)

                if (existingRecord) {
                  return {
                    ...existingRecord,
                    user_name: student.name,
                    user_email: student.email,
                  }
                } else {
                  // Create a placeholder record for students without attendance
                  return {
                    id: `placeholder-${student.id}`,
                    user_id: student.id,
                    session_id: sessionId,
                    join_time: null,
                    leave_time: null,
                    duration_minutes: null,
                    is_present: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user_name: student.name,
                    user_email: student.email,
                  }
                }
              })

              setAttendanceRecords(records)

              // Calculate attendance statistics
              const total = records.length
              const present = records.filter((record) => record.is_present).length
              const absent = total - present
              const percentage = total > 0 ? Math.round((present / total) * 100) : 0

              setStats({
                total,
                present,
                absent,
                percentage,
              })
            }
          }
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error)
        setMessage({ text: "Failed to load attendance data", type: "error" })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, sessionId])

  const handleToggleAttendance = async (recordId: string, userId: string, currentStatus: boolean) => {
    try {
      // Check if this is a placeholder record
      if (recordId.startsWith("placeholder")) {
        // Create a new attendance record
        const { data, error } = await supabase
          .from("attendance")
          .insert({
            user_id: userId,
            session_id: sessionId,
            is_present: !currentStatus,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()

        if (error) throw error

        if (data && data[0]) {
          // Update the record in the UI
          setAttendanceRecords((prev) =>
            prev.map((record) =>
              record.id === recordId
                ? {
                    ...record,
                    id: data[0].id,
                    is_present: !currentStatus,
                  }
                : record,
            ),
          )
        }
      } else {
        // Update existing record
        const { error } = await supabase
          .from("attendance")
          .update({
            is_present: !currentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", recordId)

        if (error) throw error

        // Update the record in the UI
        setAttendanceRecords((prev) =>
          prev.map((record) =>
            record.id === recordId
              ? {
                  ...record,
                  is_present: !currentStatus,
                }
              : record,
          ),
        )
      }

      // Update statistics
      const updatedRecords = attendanceRecords.map((record) =>
        record.id === recordId
          ? {
              ...record,
              is_present: !currentStatus,
            }
          : record,
      )

      const total = updatedRecords.length
      const present = updatedRecords.filter((record) => record.is_present).length
      const absent = total - present
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0

      setStats({
        total,
        present,
        absent,
        percentage,
      })
    } catch (error) {
      console.error("Error updating attendance:", error)
      setMessage({ text: "Failed to update attendance", type: "error" })
    }
  }

  // Format date for display
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Class Attendance</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Class Attendance</h1>
        <Link href="/dashboard/admin/attendance" className="text-purple-500 hover:text-purple-400">
          Back to Attendance Reports
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : session ? (
        <>
          <div className="mt-4 bg-card p-4 rounded-lg border border-gray-800">
            <h2 className="text-lg font-medium text-white">{session.title}</h2>
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

          {/* Attendance Statistics */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Total Students</h3>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Present</h3>
              <p className="mt-2 text-3xl font-semibold text-green-500">{stats.present}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Absent</h3>
              <p className="mt-2 text-3xl font-semibold text-red-500">{stats.absent}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Attendance Rate</h3>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.percentage}%</p>
              <div className="mt-2 w-full bg-gray-800 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    stats.percentage >= 75 ? "bg-green-600" : stats.percentage >= 50 ? "bg-yellow-600" : "bg-red-600"
                  }`}
                  style={{ width: `${stats.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Attendance Records */}
          <div className="mt-6">
            <h2 className="text-lg font-medium text-white mb-4">Student Attendance</h2>

            {attendanceRecords.length > 0 ? (
              <div className="overflow-x-auto bg-card rounded-lg border border-gray-800">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Student
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Join Time
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Duration
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {attendanceRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                              <span className="text-white font-medium">{record.user_name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white">{record.user_name}</div>
                              <div className="text-sm text-gray-400">{record.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {record.join_time ? formatDateTime(record.join_time) : "Did not join"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {record.duration_minutes ? `${record.duration_minutes} min` : "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.is_present ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                            }`}
                          >
                            {record.is_present ? "Present" : "Absent"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleAttendance(record.id, record.user_id, record.is_present)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              record.is_present
                                ? "bg-red-900 text-red-300 hover:bg-red-800"
                                : "bg-green-900 text-green-300 hover:bg-green-800"
                            }`}
                          >
                            {record.is_present ? "Mark Absent" : "Mark Present"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
                <p className="text-gray-400">No students are enrolled in this course.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-6 bg-card p-6 rounded-lg border border-gray-800 text-center">
          <p className="text-gray-400">Class session not found.</p>
          <Link href="/dashboard/admin/attendance" className="btn-primary inline-block mt-4">
            Back to Attendance Reports
          </Link>
        </div>
      )}
    </div>
  )
}
