"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function DataExport() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [exportType, setExportType] = useState<
    "students" | "faculty" | "courses" | "enrollments" | "attendance" | "classes"
  >("students")
  const [courseId, setCourseId] = useState<string>("")
  const [courses, setCourses] = useState<{ id: string; code: string; title: string }[]>([])
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

  const handleExport = async () => {
    if (!user || user.role !== "admin") return

    try {
      setLoading(true)
      setMessage({ text: "", type: "" })

      let data: any[] = []
      let filename = ""
      let headers: string[] = []

      switch (exportType) {
        case "students":
          const { data: studentsData, error: studentsError } = await supabase
            .from("users")
            .select("id, name, email, department, role, is_verified, created_at")
            .eq("role", "student")
            .order("name")

          if (studentsError) throw studentsError

          data = studentsData || []
          filename = "students.csv"
          headers = ["ID", "Name", "Email", "Department", "Role", "Verified", "Created At"]
          break

        case "faculty":
          const { data: facultyData, error: facultyError } = await supabase
            .from("users")
            .select("id, name, email, department, role, is_verified, created_at")
            .eq("role", "faculty")
            .order("name")

          if (facultyError) throw facultyError

          data = facultyData || []
          filename = "faculty.csv"
          headers = ["ID", "Name", "Email", "Department", "Role", "Verified", "Created At"]
          break

        case "courses":
          const { data: coursesData, error: coursesError } = await supabase
            .from("courses")
            .select("id, code, title, description, credits, room, schedule, created_at")
            .order("code")

          if (coursesError) throw coursesError

          data = coursesData || []
          filename = "courses.csv"
          headers = ["ID", "Code", "Title", "Description", "Credits", "Room", "Schedule", "Created At"]
          break

        case "enrollments":
          if (courseId) {
            // Get course details
            const { data: courseDetails, error: courseError } = await supabase
              .from("courses")
              .select("code, title")
              .eq("id", courseId)
              .single()

            if (courseError) throw courseError

            // Get enrollments for this course
            const { data: enrollmentsData, error: enrollmentsError } = await supabase
              .from("enrollments")
              .select("*, users!inner(id, name, email, department)")
              .eq("course_id", courseId)

            if (enrollmentsError) throw enrollmentsError

            data = enrollmentsData.map((enrollment) => ({
              enrollment_id: enrollment.id,
              student_id: enrollment.users.id,
              student_name: enrollment.users.name,
              student_email: enrollment.users.email,
              student_department: enrollment.users.department,
              created_at: enrollment.created_at,
            }))

            filename = `enrollments_${courseDetails.code}.csv`
            headers = [
              "Enrollment ID",
              "Student ID",
              "Student Name",
              "Student Email",
              "Student Department",
              "Enrollment Date",
            ]
          } else {
            // Get all enrollments with course and student details
            const { data: allEnrollmentsData, error: allEnrollmentsError } = await supabase
              .from("enrollments")
              .select("*, users!inner(id, name, email), courses!inner(id, code, title)")

            if (allEnrollmentsError) throw allEnrollmentsError

            data = allEnrollmentsData.map((enrollment) => ({
              enrollment_id: enrollment.id,
              student_id: enrollment.users.id,
              student_name: enrollment.users.name,
              student_email: enrollment.users.email,
              course_id: enrollment.courses.id,
              course_code: enrollment.courses.code,
              course_title: enrollment.courses.title,
              created_at: enrollment.created_at,
            }))

            filename = "all_enrollments.csv"
            headers = [
              "Enrollment ID",
              "Student ID",
              "Student Name",
              "Student Email",
              "Course ID",
              "Course Code",
              "Course Title",
              "Enrollment Date",
            ]
          }
          break

        case "attendance":
          if (courseId) {
            // Get course details
            const { data: courseDetails, error: courseError } = await supabase
              .from("courses")
              .select("code, title")
              .eq("id", courseId)
              .single()

            if (courseError) throw courseError

            // Get class sessions for this course
            const { data: sessionsData, error: sessionsError } = await supabase
              .from("class_sessions")
              .select("id, title, start_time, end_time")
              .eq("course_id", courseId)
              .order("start_time", { ascending: false })

            if (sessionsError) throw sessionsError

            // Get attendance for these sessions
            let attendanceData: any[] = []
            for (const session of sessionsData) {
              const { data: sessionAttendance, error: attendanceError } = await supabase
                .from("attendance")
                .select("*, users!inner(id, name, email)")
                .eq("session_id", session.id)

              if (attendanceError) throw attendanceError

              attendanceData = [
                ...attendanceData,
                ...sessionAttendance.map((record) => ({
                  session_id: session.id,
                  session_title: session.title,
                  session_date: new Date(session.start_time).toLocaleDateString(),
                  session_time: `${new Date(session.start_time).toLocaleTimeString()} - ${new Date(
                    session.end_time,
                  ).toLocaleTimeString()}`,
                  student_id: record.users.id,
                  student_name: record.users.name,
                  student_email: record.users.email,
                  status: record.status,
                  join_time: record.join_time ? new Date(record.join_time).toLocaleTimeString() : "N/A",
                })),
              ]
            }

            data = attendanceData
            filename = `attendance_${courseDetails.code}.csv`
            headers = [
              "Session ID",
              "Session Title",
              "Session Date",
              "Session Time",
              "Student ID",
              "Student Name",
              "Student Email",
              "Status",
              "Join Time",
            ]
          } else {
            setMessage({
              text: "Please select a course to export attendance data",
              type: "error",
            })
            return
          }
          break

        case "classes":
          const { data: classesData, error: classesError } = await supabase
            .from("class_sessions")
            .select("*, courses!inner(id, code, title)")
            .order("start_time", { ascending: false })

          if (classesError) throw classesError

          data = classesData.map((session) => ({
            session_id: session.id,
            session_title: session.title,
            course_code: session.courses.code,
            course_title: session.courses.title,
            start_time: new Date(session.start_time).toLocaleString(),
            end_time: new Date(session.end_time).toLocaleString(),
            meeting_link: session.meeting_link || "N/A",
            created_at: new Date(session.created_at).toLocaleString(),
          }))

          filename = "class_sessions.csv"
          headers = [
            "Session ID",
            "Session Title",
            "Course Code",
            "Course Title",
            "Start Time",
            "End Time",
            "Meeting Link",
            "Created At",
          ]
          break
      }

      if (data.length === 0) {
        setMessage({ text: "No data available to export", type: "info" })
        return
      }

      // Convert data to CSV
      const csvContent = [
        headers.join(","),
        ...data.map((row) =>
          Object.values(row)
            .map((value) => (value === null ? "" : String(value).replace(/,/g, ";")))
            .join(","),
        ),
      ].join("\n")

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setMessage({ text: `Successfully exported ${data.length} records to ${filename}`, type: "success" })
    } catch (error: any) {
      console.error("Error exporting data:", error)
      setMessage({ text: error.message || "Failed to export data", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Data Export</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Data Export</h1>
      <p className="mt-1 text-gray-400">Export data from the system in CSV format</p>

      {message.text && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === "success"
              ? "bg-green-900 text-green-300"
              : message.type === "info"
                ? "bg-blue-900 text-blue-300"
                : "bg-red-900 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 bg-card p-6 rounded-lg border border-gray-800">
        <div className="space-y-4">
          <div>
            <label htmlFor="exportType" className="block text-sm font-medium text-gray-400 mb-1">
              Select Data to Export
            </label>
            <select
              id="exportType"
              className="input-field"
              value={exportType}
              onChange={(e) =>
                setExportType(
                  e.target.value as "students" | "faculty" | "courses" | "enrollments" | "attendance" | "classes",
                )
              }
            >
              <option value="students">Students</option>
              <option value="faculty">Faculty</option>
              <option value="courses">Courses</option>
              <option value="enrollments">Enrollments</option>
              <option value="attendance">Attendance</option>
              <option value="classes">Class Sessions</option>
            </select>
          </div>

          {(exportType === "enrollments" || exportType === "attendance") && (
            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-gray-400 mb-1">
                Select Course {exportType === "enrollments" && "(optional)"}
              </label>
              <select
                id="courseId"
                className="input-field"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                {exportType === "enrollments" && <option value="">All Courses</option>}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-4">
            <button onClick={handleExport} className="btn-primary" disabled={loading}>
              {loading ? "Exporting..." : "Export Data"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
