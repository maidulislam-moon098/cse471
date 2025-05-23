"use client"

import type React from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function CreateClass() {
  const { user } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    meetingLink: "",
  })
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchCourses = async () => {
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
          setMessage({
            text: "You are not assigned to any courses. Please contact an administrator.",
            type: "error",
          })
          setLoading(false)
          return
        }

        const courseIds = teachingAssignments.map((assignment) => assignment.course_id)

        // Fetch course details
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("*")
          .in("id", courseIds)
          .order("code")

        if (coursesError) throw coursesError

        if (coursesData && coursesData.length > 0) {
          setCourses(coursesData)
          setFormData((prev) => ({ ...prev, courseId: coursesData[0].id }))
        } else {
          setMessage({ text: "No courses found. Please contact an administrator.", type: "error" })
        }
      } catch (error) {
        console.error("Error fetching courses:", error)
        setMessage({ text: "Failed to load courses. Please refresh the page.", type: "error" })
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || user.role !== "faculty") {
      setMessage({ text: "You don't have permission to perform this action", type: "error" })
      return
    }

    try {
      setSubmitting(true)
      setMessage({ text: "", type: "" })

      // Validate form data
      if (
        !formData.courseId ||
        !formData.title ||
        !formData.startDate ||
        !formData.startTime ||
        !formData.endDate ||
        !formData.endTime
      ) {
        setMessage({ text: "Please fill in all required fields", type: "error" })
        setSubmitting(false)
        return
      }

      // Create start and end datetime strings
      let startDateTime, endDateTime
      try {
        // Ensure proper date formatting with timezone handling
        const startDate = new Date(`${formData.startDate}T${formData.startTime}`)
        const endDate = new Date(`${formData.endDate}T${formData.endTime}`)

        startDateTime = startDate.toISOString()
        endDateTime = endDate.toISOString()
      } catch (error) {
        setMessage({ text: "Invalid date or time format", type: "error" })
        setSubmitting(false)
        return
      }

      // Validate that end time is after start time
      if (new Date(endDateTime) <= new Date(startDateTime)) {
        setMessage({ text: "End time must be after start time", type: "error" })
        setSubmitting(false)
        return
      }

      const classData = {
        course_id: formData.courseId,
        title: formData.title,
        description: formData.description || null,
        start_time: startDateTime,
        end_time: endDateTime,
        meeting_link: formData.meetingLink || null,
        created_by: user.id,
        reminder_sent: false,
        updated_at: new Date().toISOString(),
      }

      // Create class session
      const { data, error } = await supabase.from("class_sessions").insert(classData).select()

      if (error) {
        console.error("Supabase error:", error)
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error("No data returned from database after insert")
      }

      setMessage({ text: "Class session created successfully", type: "success" })

      // Reset form
      setFormData({
        courseId: formData.courseId, // Keep the selected course
        title: "",
        description: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        meetingLink: "",
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/faculty/classes")
      }, 2000)
    } catch (error: any) {
      console.error("Error creating class session:", error)
      setMessage({
        text: `Failed to create class session: ${error.message || "Unknown error"}`,
        type: "error",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (user?.role !== "faculty") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Schedule a Class</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Schedule a New Class</h1>
          <p className="mt-1 text-gray-400">Create a new online class session for a course</p>
        </div>
        <Link href="/dashboard/faculty/classes" className="text-purple-500 hover:text-purple-400">
          Back to Classes
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
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
                  {courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
                  Class Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  className="input-field"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Introduction to System Analysis"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="input-field"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter a description for this class session"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-400 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    className="input-field"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-400 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="startTime"
                    name="startTime"
                    type="time"
                    className="input-field"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-400 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    className="input-field"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-400 mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="endTime"
                    name="endTime"
                    type="time"
                    className="input-field"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="meetingLink" className="block text-sm font-medium text-gray-400 mb-1">
                  Meeting Link
                </label>
                <input
                  id="meetingLink"
                  name="meetingLink"
                  type="url"
                  className="input-field"
                  value={formData.meetingLink}
                  onChange={handleChange}
                  placeholder="e.g., https://meet.google.com/abc-defg-hij"
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={submitting || courses.length === 0}>
                  {submitting ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    "Schedule Class"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
