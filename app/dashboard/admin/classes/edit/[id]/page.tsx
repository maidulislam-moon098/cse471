"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"]
type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function EditClass() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

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
    const fetchData = async () => {
      if (!user || user.role !== "admin" || !sessionId) return

      try {
        setLoading(true)

        // Fetch all courses
        const { data: coursesData, error: coursesError } = await supabase.from("courses").select("*").order("code")

        if (coursesError) throw coursesError
        setCourses(coursesData || [])

        // Fetch class session
        const { data: sessionData, error: sessionError } = await supabase
          .from("class_sessions")
          .select("*")
          .eq("id", sessionId)
          .single()

        if (sessionError) throw sessionError

        if (sessionData) {
          // Format dates and times for form inputs
          const startDateTime = new Date(sessionData.start_time)
          const endDateTime = new Date(sessionData.end_time)

          const formatDateForInput = (date: Date) => {
            return date.toISOString().split("T")[0]
          }

          const formatTimeForInput = (date: Date) => {
            return date.toTimeString().split(" ")[0].substring(0, 5)
          }

          setFormData({
            courseId: sessionData.course_id,
            title: sessionData.title,
            description: sessionData.description || "",
            startDate: formatDateForInput(startDateTime),
            startTime: formatTimeForInput(startDateTime),
            endDate: formatDateForInput(endDateTime),
            endTime: formatTimeForInput(endDateTime),
            meetingLink: sessionData.meeting_link || "",
          })
        } else {
          setMessage({ text: "Class session not found", type: "error" })
        }
      } catch (error: any) {
        console.error("Error fetching data:", error)
        setMessage({ text: error.message || "Failed to fetch data", type: "error" })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, sessionId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || user.role !== "admin" || !sessionId) return

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
        return
      }

      // Create start and end datetime strings
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`).toISOString()
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`).toISOString()

      // Validate that end time is after start time
      if (new Date(endDateTime) <= new Date(startDateTime)) {
        setMessage({ text: "End time must be after start time", type: "error" })
        return
      }

      // Update class session
      const { error } = await supabase
        .from("class_sessions")
        .update({
          course_id: formData.courseId,
          title: formData.title,
          description: formData.description || null,
          start_time: startDateTime,
          end_time: endDateTime,
          meeting_link: formData.meetingLink || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)

      if (error) throw error

      setMessage({ text: "Class session updated successfully", type: "success" })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/admin/classes")
      }, 2000)
    } catch (error: any) {
      console.error("Error updating class session:", error)
      setMessage({ text: error.message || "Failed to update class session", type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Edit Class Session</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Edit Class Session</h1>
        <Link href="/dashboard/admin/classes" className="text-purple-500 hover:text-purple-400">
          Back to Classes
        </Link>
      </div>
      <p className="mt-1 text-gray-400">Update class session information</p>

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

              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard/admin/classes"
                  className="px-4 py-2 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Link>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
