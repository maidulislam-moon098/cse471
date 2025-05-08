"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type Course = Database["public"]["Tables"]["courses"]["Row"]
type UserProfile = Database["public"]["Tables"]["users"]["Row"]

export default function TargetedAnnouncements() {
  const { user } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [debug, setDebug] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    courseId: "",
    targetType: "all", // all, specific
    selectedStudents: [] as string[],
    urgency: "normal", // normal, urgent, critical
  })
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user || (user.role !== "admin" && user.role !== "faculty")) return

      try {
        setLoading(true)
        setDebug("Fetching data...")

        // Fetch courses
        let coursesQuery = supabase.from("courses").select("*").order("code")

        if (user.role === "faculty") {
          // Get courses the faculty teaches
          const { data: teachings, error: teachingsError } = await supabase
            .from("teaching_assignments")
            .select("course_id")
            .eq("user_id", user.id)

          if (teachingsError) {
            setDebug(`Error fetching teaching assignments: ${JSON.stringify(teachingsError)}`)
            throw teachingsError
          }

          if (teachings && teachings.length > 0) {
            const courseIds = teachings.map((t) => t.course_id)
            coursesQuery = coursesQuery.in("id", courseIds)
          } else {
            // Faculty not teaching any courses
            setCourses([])
            setStudents([])
            setLoading(false)
            return
          }
        }

        const { data: coursesData, error: coursesError } = await coursesQuery

        if (coursesError) {
          setDebug(`Error fetching courses: ${JSON.stringify(coursesError)}`)
          throw coursesError
        }

        setDebug(`Fetched ${coursesData?.length || 0} courses`)
        setCourses(coursesData || [])

        if (coursesData && coursesData.length > 0) {
          setFormData((prev) => ({ ...prev, courseId: coursesData[0].id }))

          // Fetch students enrolled in the first course
          const { data: enrolledStudents, error: enrolledError } = await supabase
            .from("enrollments")
            .select("user_id")
            .eq("course_id", coursesData[0].id)

          if (enrolledError) {
            setDebug(`Error fetching enrollments: ${JSON.stringify(enrolledError)}`)
            throw enrolledError
          }

          if (enrolledStudents && enrolledStudents.length > 0) {
            const studentIds = enrolledStudents.map((e) => e.user_id)

            // Get student details
            const { data: studentsData, error: studentsError } = await supabase
              .from("users")
              .select("*")
              .eq("role", "student")
              .in("id", studentIds)
              .order("name")

            if (studentsError) {
              setDebug(`Error fetching students: ${JSON.stringify(studentsError)}`)
              throw studentsError
            }

            setDebug(`Fetched ${studentsData?.length || 0} students`)
            setStudents(studentsData || [])
          } else {
            setStudents([])
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setDebug(`Error in fetchData: ${JSON.stringify(error)}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // If course changes, fetch students for that course
    if (name === "courseId" && value) {
      fetchStudentsForCourse(value)
    }
  }

  const handleStudentSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map((option) => option.value)
    setFormData((prev) => ({ ...prev, selectedStudents: selectedOptions }))
  }

  const fetchStudentsForCourse = async (courseId: string) => {
    try {
      setDebug(`Fetching students for course ${courseId}`)

      // Fetch students enrolled in the selected course
      const { data: enrolledStudents, error: enrolledError } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", courseId)

      if (enrolledError) {
        setDebug(`Error fetching enrollments: ${JSON.stringify(enrolledError)}`)
        throw enrolledError
      }

      if (enrolledStudents && enrolledStudents.length > 0) {
        const studentIds = enrolledStudents.map((e) => e.user_id)

        // Get student details
        const { data: studentsData, error: studentsError } = await supabase
          .from("users")
          .select("*")
          .eq("role", "student")
          .in("id", studentIds)
          .order("name")

        if (studentsError) {
          setDebug(`Error fetching students: ${JSON.stringify(studentsError)}`)
          throw studentsError
        }

        setDebug(`Fetched ${studentsData?.length || 0} students for course ${courseId}`)
        setStudents(studentsData || [])
        setFormData((prev) => ({ ...prev, selectedStudents: [] }))
      } else {
        setStudents([])
        setFormData((prev) => ({ ...prev, selectedStudents: [] }))
      }
    } catch (error) {
      console.error("Error fetching students for course:", error)
      setDebug(`Error in fetchStudentsForCourse: ${JSON.stringify(error)}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || (user.role !== "admin" && user.role !== "faculty")) {
      setMessage({ text: "You don't have permission to send announcements", type: "error" })
      return
    }

    try {
      setSubmitting(true)
      setMessage({ text: "", type: "" })
      setDebug("Starting announcement creation process...")

      // Validate form data
      if (!formData.title || !formData.content || !formData.courseId) {
        setMessage({ text: "Title, content, and course are required", type: "error" })
        setSubmitting(false)
        return
      }

      if (formData.targetType === "specific" && formData.selectedStudents.length === 0) {
        setMessage({ text: "Please select at least one student", type: "error" })
        setSubmitting(false)
        return
      }

      // Create announcement
      const announcementData = {
        course_id: formData.courseId,
        title: formData.title,
        content: formData.content,
        created_by: user.id,
        urgency_level: formData.urgency,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setDebug(`Creating announcement: ${JSON.stringify(announcementData)}`)

      const { data: announcementResult, error: announcementError } = await supabase
        .from("announcements")
        .insert(announcementData)
        .select()

      if (announcementError) {
        setDebug(`Error creating announcement: ${JSON.stringify(announcementError)}`)
        throw announcementError
      }

      if (!announcementResult || announcementResult.length === 0) {
        throw new Error("Failed to create announcement")
      }

      const announcementId = announcementResult[0].id
      setDebug(`Announcement created with ID: ${announcementId}`)

      // Determine target students
      let targetStudentIds: string[] = []

      if (formData.targetType === "all") {
        // Get all students in the course
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select("user_id")
          .eq("course_id", formData.courseId)

        if (enrollmentsError) {
          setDebug(`Error fetching enrollments: ${JSON.stringify(enrollmentsError)}`)
          throw enrollmentsError
        }

        targetStudentIds = enrollments?.map((e) => e.user_id) || []
      } else {
        // Use selected students
        targetStudentIds = formData.selectedStudents
      }

      setDebug(`Target students: ${targetStudentIds.length} students`)

      // Create announcement recipients
      if (targetStudentIds.length > 0) {
        const recipientData = targetStudentIds.map((studentId) => ({
          announcement_id: announcementId,
          user_id: studentId,
          is_read: false,
          created_at: new Date().toISOString(),
        }))

        setDebug(`Creating ${recipientData.length} announcement recipients`)

        const { error: recipientsError } = await supabase.from("announcement_recipients").insert(recipientData)

        if (recipientsError) {
          setDebug(`Error creating recipients: ${JSON.stringify(recipientsError)}`)
          throw recipientsError
        }
      }

      setDebug("Announcement and recipients created successfully")
      setMessage({ text: "Announcement sent successfully", type: "success" })

      // Reset form
      setFormData({
        title: "",
        content: "",
        courseId: courses.length > 0 ? courses[0].id : "",
        targetType: "all",
        selectedStudents: [],
        urgency: "normal",
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/admin/announcements")
      }, 2000)
    } catch (error: any) {
      console.error("Error sending announcement:", error)
      setDebug(`Error in handleSubmit: ${JSON.stringify(error)}`)
      setMessage({ text: error.message || "Failed to send announcement", type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user || (user.role !== "admin" && user.role !== "faculty")) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Targeted Announcements</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Send Targeted Announcement</h1>
        <Link href="/dashboard/admin/announcements" className="text-purple-500 hover:text-purple-400">
          Back to Announcements
        </Link>
      </div>
      <p className="mt-1 text-gray-400">Send announcements to specific students or an entire course</p>

      {debug && (
        <div className="mt-4 p-3 bg-gray-800 rounded text-xs font-mono text-gray-300 max-h-32 overflow-auto">
          <p>Debug Info:</p>
          <pre>{debug}</pre>
        </div>
      )}

      <div className="mt-6">
        <div className="bg-card p-6 rounded-lg border border-gray-800">
          {message.text && (
            <div
              className={`mb-6 p-3 rounded ${
                message.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
              }`}
            >
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400">
                {user.role === "faculty"
                  ? "You are not teaching any courses. Please contact an administrator."
                  : "No courses available. Please create a course first."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="courseId" className="block text-sm font-medium text-gray-400 mb-1">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  id="courseId"
                  name="courseId"
                  className="input-field"
                  value={formData.courseId}
                  onChange={handleChange}
                  required
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
                  Announcement Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  className="input-field"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Important Update About Midterm Exam"
                  required
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">
                  Announcement Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  className="input-field"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Enter the announcement content"
                  rows={5}
                  required
                />
              </div>

              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-400 mb-1">
                  Urgency Level
                </label>
                <select
                  id="urgency"
                  name="urgency"
                  className="input-field"
                  value={formData.urgency}
                  onChange={handleChange}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Target Recipients</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="targetAll"
                      name="targetType"
                      type="radio"
                      value="all"
                      checked={formData.targetType === "all"}
                      onChange={handleChange}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <label htmlFor="targetAll" className="ml-2 block text-sm text-gray-400">
                      All students in the course
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="targetSpecific"
                      name="targetType"
                      type="radio"
                      value="specific"
                      checked={formData.targetType === "specific"}
                      onChange={handleChange}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <label htmlFor="targetSpecific" className="ml-2 block text-sm text-gray-400">
                      Specific students
                    </label>
                  </div>
                </div>
              </div>

              {formData.targetType === "specific" && (
                <div>
                  <label htmlFor="selectedStudents" className="block text-sm font-medium text-gray-400 mb-1">
                    Select Students <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="selectedStudents"
                    name="selectedStudents"
                    multiple
                    className="input-field h-48"
                    value={formData.selectedStudents}
                    onChange={handleStudentSelection}
                    required={formData.targetType === "specific"}
                  >
                    {students.length === 0 ? (
                      <option disabled>No students enrolled in this course</option>
                    ) : (
                      students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.email})
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Hold Ctrl (or Cmd) to select multiple students</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard/admin/announcements"
                  className="px-4 py-2 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Link>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Sending..." : "Send Announcement"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
