"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Bar, Pie, Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

export default function SystemReports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<"attendance" | "enrollment" | "activity">("attendance")
  const [timeRange, setTimeRange] = useState<"week" | "month" | "semester">("month")
  const [courseId, setCourseId] = useState<string>("")
  const [courses, setCourses] = useState<{ id: string; code: string; title: string }[]>([])
  const [reportData, setReportData] = useState<any>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user || user.role !== "admin") return

      try {
        const { data, error } = await supabase.from("courses").select("id, code, title").order("code")

        if (error) throw error

        setCourses(data || [])
        if (data && data.length > 0) {
          setCourseId(data[0].id)
        }
      } catch (error) {
        console.error("Error fetching courses:", error)
      }
    }

    fetchCourses()
  }, [user])

  useEffect(() => {
    if (!user || user.role !== "admin" || !courseId) return

    const generateReport = async () => {
      try {
        setLoading(true)

        switch (reportType) {
          case "attendance":
            await generateAttendanceReport()
            break
          case "enrollment":
            await generateEnrollmentReport()
            break
          case "activity":
            await generateActivityReport()
            break
        }
      } catch (error) {
        console.error("Error generating report:", error)
      } finally {
        setLoading(false)
      }
    }

    generateReport()
  }, [reportType, timeRange, courseId, user])

  const generateAttendanceReport = async () => {
    // Get date range
    const endDate = new Date()
    let startDate: Date

    switch (timeRange) {
      case "week":
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        break
      case "month":
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case "semester":
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 4) // Approximately a semester
        break
    }

    // Get class sessions for this course in the date range
    const { data: sessions, error: sessionsError } = await supabase
      .from("class_sessions")
      .select("id, title, start_time")
      .eq("course_id", courseId)
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString())
      .order("start_time")

    if (sessionsError) throw sessionsError

    if (!sessions || sessions.length === 0) {
      setReportData(null)
      return
    }

    // Get attendance for these sessions
    const attendanceData: Record<string, { present: number; absent: number; late: number }> = {}

    for (const session of sessions) {
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("status")
        .eq("session_id", session.id)

      if (attendanceError) throw attendanceError

      const sessionDate = new Date(session.start_time).toLocaleDateString()
      const present = attendance?.filter((a) => a.status === "present").length || 0
      const absent = attendance?.filter((a) => a.status === "absent").length || 0
      const late = attendance?.filter((a) => a.status === "late").length || 0

      attendanceData[sessionDate] = { present, absent, late }
    }

    // Format data for chart
    const labels = Object.keys(attendanceData)
    const presentData = labels.map((date) => attendanceData[date].present)
    const absentData = labels.map((date) => attendanceData[date].absent)
    const lateData = labels.map((date) => attendanceData[date].late)

    setReportData({
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Present",
            data: presentData,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
          {
            label: "Absent",
            data: absentData,
            backgroundColor: "rgba(255, 99, 132, 0.6)",
          },
          {
            label: "Late",
            data: lateData,
            backgroundColor: "rgba(255, 206, 86, 0.6)",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top" as const,
          },
          title: {
            display: true,
            text: "Attendance by Session",
            color: "white",
          },
        },
        scales: {
          x: {
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
          y: {
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
        },
      },
    })
  }

  const generateEnrollmentReport = async () => {
    // Get all courses
    const { data: allCourses, error: coursesError } = await supabase.from("courses").select("id, code, title")

    if (coursesError) throw coursesError

    if (!allCourses || allCourses.length === 0) {
      setReportData(null)
      return
    }

    // Get enrollment counts for each course
    const enrollmentData: Record<string, number> = {}

    for (const course of allCourses) {
      const { count, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", course.id)

      if (enrollmentError) throw enrollmentError

      enrollmentData[`${course.code}`] = count || 0
    }

    // Format data for chart
    const labels = Object.keys(enrollmentData)
    const data = Object.values(enrollmentData)

    setReportData({
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              "rgba(255, 99, 132, 0.6)",
              "rgba(54, 162, 235, 0.6)",
              "rgba(75, 192, 192, 0.6)",
              "rgba(153, 102, 255, 0.6)",
              "rgba(255, 159, 64, 0.6)",
              "rgba(255, 206, 86, 0.6)",
              "rgba(231, 233, 237, 0.6)",
              "rgba(75, 192, 192, 0.6)",
            ],
            borderColor: [
              "rgba(255, 99, 132, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(153, 102, 255, 1)",
              "rgba(255, 159, 64, 1)",
              "rgba(255, 206, 86, 1)",
              "rgba(231, 233, 237, 1)",
              "rgba(75, 192, 192, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "right" as const,
            labels: {
              color: "white",
            },
          },
          title: {
            display: true,
            text: "Enrollment by Course",
            color: "white",
          },
        },
      },
    })
  }

  const generateActivityReport = async () => {
    // Get date range
    const endDate = new Date()
    let startDate: Date

    switch (timeRange) {
      case "week":
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        break
      case "month":
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case "semester":
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 4) // Approximately a semester
        break
    }

    // Get system activity (logins, class joins, etc.)
    const { data: activityLogs, error: logsError } = await supabase
      .from("activity_logs")
      .select("action, created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at")

    if (logsError) throw logsError

    if (!activityLogs || activityLogs.length === 0) {
      setReportData(null)
      return
    }

    // Group activity by date and type
    const activityData: Record<string, Record<string, number>> = {}
    const actionTypes = new Set<string>()

    activityLogs.forEach((log) => {
      const date = new Date(log.created_at).toLocaleDateString()
      const action = log.action

      if (!activityData[date]) {
        activityData[date] = {}
      }

      if (!activityData[date][action]) {
        activityData[date][action] = 0
      }

      activityData[date][action]++
      actionTypes.add(action)
    })

    // Format data for chart
    const labels = Object.keys(activityData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    const datasets = Array.from(actionTypes).map((action) => {
      const color = getRandomColor()
      return {
        label: action,
        data: labels.map((date) => activityData[date][action] || 0),
        borderColor: color,
        backgroundColor: color.replace("1)", "0.2)"),
        tension: 0.1,
      }
    })

    setReportData({
      type: "line",
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top" as const,
            labels: {
              color: "white",
            },
          },
          title: {
            display: true,
            text: "System Activity Over Time",
            color: "white",
          },
        },
        scales: {
          x: {
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
          y: {
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
        },
      },
    })
  }

  const getRandomColor = () => {
    const r = Math.floor(Math.random() * 255)
    const g = Math.floor(Math.random() * 255)
    const b = Math.floor(Math.random() * 255)
    return `rgba(${r}, ${g}, ${b}, 1)`
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">System Reports</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">System Reports</h1>
      <p className="mt-1 text-gray-400">View detailed reports and analytics</p>

      <div className="mt-6 bg-card p-6 rounded-lg border border-gray-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="reportType" className="block text-sm font-medium text-gray-400 mb-1">
              Report Type
            </label>
            <select
              id="reportType"
              className="input-field"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as "attendance" | "enrollment" | "activity")}
            >
              <option value="attendance">Attendance Report</option>
              <option value="enrollment">Enrollment Distribution</option>
              <option value="activity">System Activity</option>
            </select>
          </div>

          <div>
            <label htmlFor="timeRange" className="block text-sm font-medium text-gray-400 mb-1">
              Time Range
            </label>
            <select
              id="timeRange"
              className="input-field"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as "week" | "month" | "semester")}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="semester">Last Semester</option>
            </select>
          </div>

          {reportType === "attendance" && (
            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-gray-400 mb-1">
                Select Course
              </label>
              <select
                id="courseId"
                className="input-field"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
          ) : reportData ? (
            <div className="bg-gray-900 p-4 rounded-lg">
              {reportData.type === "bar" && <Bar data={reportData.data} options={reportData.options} />}
              {reportData.type === "pie" && <Pie data={reportData.data} options={reportData.options} />}
              {reportData.type === "line" && <Line data={reportData.data} options={reportData.options} />}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">No data available for the selected report parameters.</div>
          )}
        </div>
      </div>
    </div>
  )
}
