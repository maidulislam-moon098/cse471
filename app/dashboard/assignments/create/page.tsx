"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { useRouter, useSearchParams } from "next/navigation"

type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function CreateAssignment() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get("courseId")

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [success, setSuccess] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const supabase = getSupabaseBrowserClient()

  const [formData, setFormData] = useState({
    courseId: courseId || "",
    title: "",
    description: "",
    instructions: "",
    dueDate: "",
    dueTime: "23:59",
    maxPoints: 100,
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "faculty") {
        router.push("/dashboard")
        return
      }

      try {
        setLoading(true)

        // Fetch courses taught by this faculty
        const { data: assignments, error: assignmentsError } = await supabase
          .from("teaching_assignments")
          .select("course_id")
          .eq("user_id", user.id)

        if (assignmentsError) throw assignmentsError

        if (assignments && assignments.length > 0) {
          const courseIds = assignments.map((a) => a.course_id)

          const { data: coursesData, error: coursesError } = await supabase
            .from("courses")
            .select("*")
            .in("id", courseIds)

          if (coursesError) throw coursesError
          if (coursesData) setCourses(coursesData)
        }
      } catch (error) {
        console.error("Error fetching courses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError("User not authenticated")
      return
    }

    try {
      setSubmitting(true)
      setError("")
      setDebugInfo(null)

      // Validate form data
      if (!formData.courseId) {
        setError("Please select a course")
        return
      }

      if (!formData.title) {
        setError("Please enter a title")
        return
      }

      if (!formData.instructions) {
        setError("Please enter instructions")
        return
      }

      if (!formData.dueDate) {
        setError("Please select a due date")
        return
      }

      // Combine date and time for due date
      const dueDatetime = new Date(`${formData.dueDate}T${formData.dueTime}:00`)

      // Check if date is valid
      if (isNaN(dueDatetime.getTime())) {
        setError("Invalid date format")
        return
      }

      // Upload file if provided
      let fileUrl = null
      let fileName = null
      let fileType = null
      let fileSize = null

      if (file) {
        try {
          const fileExt = file.name.split(".").pop()
          const filePath = `${formData.courseId}/${Date.now()}.${fileExt}`

          // First check if the bucket exists
          const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

          const bucketExists = buckets?.some((bucket) => bucket.name === "assignments")

          if (!bucketExists) {
            // If bucket doesn't exist, we'll skip file upload but still create the assignment
            console.log("Assignments bucket doesn't exist. Skipping file upload.")
            setDebugInfo({ ...debugInfo, bucketError: "Assignments bucket doesn't exist" })
          } else {
            // Proceed with upload
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("assignments")
              .upload(filePath, file)

            if (uploadError) {
              console.error("File upload error:", uploadError)
              setDebugInfo({ ...debugInfo, uploadError })
              // Continue with assignment creation even if file upload fails
            } else {
              // Get public URL
              const {
                data: { publicUrl },
              } = supabase.storage.from("assignments").getPublicUrl(filePath)

              fileUrl = publicUrl
              fileName = file.name
              fileType = file.type
              fileSize = file.size
            }
          }
        } catch (uploadErr) {
          console.error("Error during file upload:", uploadErr)
          setDebugInfo({ ...debugInfo, uploadErr })
          // Continue with assignment creation even if file upload fails
        }
      }

      // Prepare assignment data
      const assignmentData = {
        course_id: formData.courseId,
        title: formData.title,
        description: formData.description || null,
        instructions: formData.instructions,
        due_date: dueDatetime.toISOString(),
        max_points: Number(formData.maxPoints),
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        created_by: user.id,
      }

      // Log the data being sent
      console.log("Sending assignment data:", assignmentData)
      setDebugInfo({ assignmentData })

      // Create assignment
      const { data, error } = await supabase.from("assignments").insert(assignmentData).select()

      if (error) {
        console.error("Database error:", error)

        // Check for specific error types
        if (error.code === "23503") {
          setError(`Foreign key constraint error: Make sure the course exists.`)
        } else if (error.code === "23505") {
          setError(`An assignment with this title already exists for this course.`)
        } else {
          setError(`Database error: ${error.message}`)
        }

        setDebugInfo({ ...debugInfo, dbError: error })
        return
      }

      console.log("Assignment created successfully:", data)
      setDebugInfo({ ...debugInfo, createdAssignment: data })
      setSuccess(true)

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/assignments/manage")
      }, 3000)
    } catch (error: any) {
      console.error("Error creating assignment:", error)
      setError(`Error: ${error.message || "Unknown error occurred"}`)
      setDebugInfo({ ...debugInfo, error })
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
      <h1 className="text-2xl font-semibold text-white">Create Assignment</h1>
      <p className="mt-1 text-gray-400">Create a new assignment for your course</p>

      {error && (
        <div className="mt-4 p-3 bg-red-900 text-red-300 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-900 text-green-300 rounded">
          <p>Assignment created successfully! Redirecting in 3 seconds...</p>
        </div>
      )}

      {debugInfo && (
        <div className="mt-4 p-3 bg-gray-900 text-gray-300 rounded">
          <p className="font-bold">Debug Info:</p>
          <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(debugInfo, null, 2)}</pre>
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
              <label htmlFor="file" className="block text-sm font-medium text-gray-400 mb-1">
                Attachment (Optional)
              </label>
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
              <p className="mt-1 text-xs text-gray-500">Upload any supporting documents (PDF, DOCX, PPT, etc.)</p>
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
              {submitting ? "Creating..." : "Create Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
