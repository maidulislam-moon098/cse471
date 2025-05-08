"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { useRouter, useParams } from "next/navigation"

type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function EditAssignment() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [currentFile, setCurrentFile] = useState<{
    url: string | null
    name: string | null
    type: string | null
    size: number | null
  }>({
    url: null,
    name: null,
    type: null,
    size: null,
  })
  const supabase = getSupabaseBrowserClient()

  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    description: "",
    instructions: "",
    dueDate: "",
    dueTime: "23:59",
    maxPoints: 100,
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "faculty" || !assignmentId) {
        router.push("/dashboard")
        return
      }

      try {
        setLoading(true)

        // Fetch assignment details
        const { data: assignment, error: assignmentError } = await supabase
          .from("assignments")
          .select("*")
          .eq("id", assignmentId)
          .single()

        if (assignmentError) throw assignmentError
        if (!assignment) throw new Error("Assignment not found")

        // Fetch courses taught by this faculty
        const { data: teachingAssignments, error: assignmentsError } = await supabase
          .from("teaching_assignments")
          .select("course_id")
          .eq("user_id", user.id)

        if (assignmentsError) throw assignmentsError

        if (teachingAssignments && teachingAssignments.length > 0) {
          const courseIds = teachingAssignments.map((a) => a.course_id)

          const { data: coursesData, error: coursesError } = await supabase
            .from("courses")
            .select("*")
            .in("id", courseIds)

          if (coursesError) throw coursesError
          if (coursesData) setCourses(coursesData)
        }

        // Verify this faculty can edit this assignment
        const canEdit = teachingAssignments?.some((a) => a.course_id === assignment.course_id)
        if (!canEdit) {
          router.push("/dashboard/assignments/manage")
          return
        }

        // Format date and time
        const dueDate = new Date(assignment.due_date)
        const formattedDate = dueDate.toISOString().split("T")[0]
        const hours = dueDate.getHours().toString().padStart(2, "0")
        const minutes = dueDate.getMinutes().toString().padStart(2, "0")
        const formattedTime = `${hours}:${minutes}`

        // Set form data
        setFormData({
          courseId: assignment.course_id,
          title: assignment.title,
          description: assignment.description || "",
          instructions: assignment.instructions || "",
          dueDate: formattedDate,
          dueTime: formattedTime,
          maxPoints: assignment.max_points,
        })

        // Set current file info
        if (assignment.file_url) {
          setCurrentFile({
            url: assignment.file_url,
            name: assignment.file_name,
            type: assignment.file_type,
            size: assignment.file_size,
          })
        }
      } catch (error) {
        console.error("Error fetching assignment:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, assignmentId, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleRemoveFile = () => {
    setCurrentFile({ url: null, name: null, type: null, size: null })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      setSubmitting(true)
      setError("")

      // Combine date and time for due date
      const dueDatetime = new Date(`${formData.dueDate}T${formData.dueTime}:00`)

      // Upload file if provided
      let fileUrl = currentFile.url
      let fileName = currentFile.name
      let fileType = currentFile.type
      let fileSize = currentFile.size

      if (file) {
        const fileExt = file.name.split(".").pop()
        const filePath = `assignments/${formData.courseId}/${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("assignments")
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("assignments").getPublicUrl(filePath)

        fileUrl = publicUrl
        fileName = file.name
        fileType = file.type
        fileSize = file.size
      }

      // Update assignment
      const { data, error } = await supabase
        .from("assignments")
        .update({
          course_id: formData.courseId,
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          due_date: dueDatetime.toISOString(),
          max_points: Number.parseInt(formData.maxPoints.toString()),
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)
        .select()

      if (error) throw error

      setSuccess(true)

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/assignments/manage")
      }, 2000)
    } catch (error: any) {
      console.error("Error updating assignment:", error)
      setError(error.message || "Failed to update assignment")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Edit Assignment</h1>
      <p className="mt-1 text-gray-400">Update assignment details</p>

      {error && <div className="mt-4 p-3 bg-red-900 text-red-300 rounded">{error}</div>}

      {success && (
        <div className="mt-4 p-3 bg-green-900 text-green-300 rounded">
          Assignment updated successfully! Redirecting...
        </div>
      )}

      <div className="mt-6 bg-card p-6 rounded-lg border border-gray-800">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-gray-400 mb-1">
                Course
              </label>
              <select
                id="courseId"
                name="courseId"
                className="input-field"
                value={formData.courseId}
                onChange={handleChange}
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
                Assignment Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className="input-field"
                value={formData.title}
                onChange={handleChange}
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
                rows={3}
                className="input-field"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="instructions" className="block text-sm font-medium text-gray-400 mb-1">
                Instructions
              </label>
              <textarea
                id="instructions"
                name="instructions"
                rows={5}
                className="input-field"
                value={formData.instructions}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-400 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  className="input-field"
                  value={formData.dueDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="dueTime" className="block text-sm font-medium text-gray-400 mb-1">
                  Due Time
                </label>
                <input
                  type="time"
                  id="dueTime"
                  name="dueTime"
                  className="input-field"
                  value={formData.dueTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="maxPoints" className="block text-sm font-medium text-gray-400 mb-1">
                Maximum Points
              </label>
              <input
                type="number"
                id="maxPoints"
                name="maxPoints"
                className="input-field"
                value={formData.maxPoints}
                onChange={handleChange}
                min="1"
                max="1000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Attachment</label>

              {currentFile.url ? (
                <div className="bg-gray-800 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-white">Current file: {currentFile.name}</p>
                      {currentFile.type && <p className="text-xs text-gray-400">Type: {currentFile.type}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={currentFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <input
                type="file"
                id="file"
                name="file"
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-medium
                  file:bg-purple-600 file:text-white
                  hover:file:bg-purple-700
                  file:cursor-pointer cursor-pointer"
                onChange={handleFileChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                {currentFile.url
                  ? "Upload a new file to replace the current one"
                  : "Upload any supporting documents (PDF, DOCX, PPT, etc.)"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push("/dashboard/assignments/manage")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Updating..." : "Update Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
