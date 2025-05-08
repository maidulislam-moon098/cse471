"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Attendance = Database["public"]["Tables"]["attendance"]["Row"] & {
  session_title: string
  course_code: string
  course_title: string
  start_time: string
  end_time: string
}

export default function Attendance() {
  const { user } = useAuth()
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
  })
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "student") return

      try {
        setLoading(true)

        // Fetch attendance records for the student
        const { data: records, error: recordsError } = await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (recordsError) throw recordsError

        if (records && records.length > 0) {
          // Fetch session details for each attendance record
          const recordsWithDetails = await Promise.all(
            records.map(async (record) => {
              const { data: sessionData, error: sessionError } = await supabase
                .from("class_sessions")
                .select("title, course_id, start_time, end_time")
                .eq("id", record.session_id)
                .single()

              if (sessionError) {
                return {
                  ...record,
                  session_title: "Unknown Session",
                  course_code: "Unknown",
                  course_title: "Unknown",
                  start_time: "",
                  end_time: "",
                }
              }

              // Fetch course details
              const { data: courseData, error: courseError } = await supabase
                .from("courses")
                .select("code, title")
                .eq("id", sessionData.course_id)
                .single()

              if (courseError) {
                return {
                  ...record,
                  session_title: sessionData.title,
                  course_code: "Unknown",
                  course_title: "Unknown",
                  start_time: sessionData.start_time,
                  end_time: sessionData.end_time,
                }
              }

              return {
                ...record,
                session_title: sessionData.title,
                course_code: courseData.code,
                course_title: courseData.title,
                start_time: sessionData.start_time,
                end_time: sessionData.end_time,
              }
            }),
          )

          setAttendanceRecords(recordsWithDetails)

          // Calculate attendance statistics
          const total = recordsWithDetails.length
          const present = recordsWithDetails.filter((record) => record.is_present).length
          const absent = total - present
          const percentage = total > 0 ? Math.round((present / total) * 100) : 0

          setStats({
            total,
            present,
            absent,
            percentage,
          })
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // If no data is available yet, show mock data
  useEffect(() => {
    if (!loading && attendanceRecords.length === 0 && user?.role === "student") {
      // Set mock data if no real data is available
      const mockRecords: Attendance[] = [
        {
          id: "1",
          user_id: user.id,
          session_id: "1",
          join_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          leave_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 120,
          is_present: true,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          session_title: "Introduction to System Analysis",
          course_code: "CSE471",
          course_title: "System Analysis and Design",
          start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "2",
          user_id: user.id,
          session_id: "2",
          join_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          leave_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 90,
          is_present: true,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          session_title: "Data Structures: Trees and Graphs",
          course_code: "CSE331",
          course_title: "Data Structures",
          start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "3",
          user_id: user.id,
          session_id: "3",
          join_time: null,
          leave_time: null,
          duration_minutes: 0,
          is_present: false,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          session_title: "Web Development Frameworks",
          course_code: "CSE482",
          course_title: "Internet and Web Technology",
          start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        },
      ]

      setAttendanceRecords(mockRecords)
      setStats({
        total: 3,
        present: 2,
        absent: 1,
        percentage: 67,
      })
    }
  }, [loading, attendanceRecords.length, user])

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Format time for display
  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (user?.role !== "student") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Attendance Records</h1>
        <p className="mt-4 text-gray-400">This page is only available for students.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Attendance Records</h1>
      <p className="mt-1 text-gray-400">View your class attendance history</p>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          {/* Attendance Statistics */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Total Classes</h3>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Classes Attended</h3>
              <p className="mt-2 text-3xl font-semibold text-green-500">{stats.present}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Classes Missed</h3>
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

          {/* Attendance Records Table */}
          <div className="mt-6">
            <h2 className="text-lg font-medium text-white mb-4">Attendance History</h2>
            <div className="overflow-x-auto bg-card rounded-lg border border-gray-800">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Course
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Session
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {attendanceRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{formatDate(record.start_time)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{record.course_code}</div>
                        <div className="text-sm text-gray-400">{record.course_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{record.session_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {record.join_time ? formatTime(record.join_time) : "Did not join"}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
