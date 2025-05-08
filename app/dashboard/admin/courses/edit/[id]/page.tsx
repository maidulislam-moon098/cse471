"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function EditCourse() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [formData, setFormData] = useState<Partial<Course>>({
    code: "",
    title: "",
    description: "",
    credits: 3,
    room: "",
    schedule: "",
  })

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchCourse = async () => {
      if (!user || user.role !== "admin" || !courseId) return

      try {
        setLoading(true)

        const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).single()

        if (error) throw error

        if (data) {
          setFormData({
            code: data.code,
            title: data.title,
            description: data.description || "",
            credits: data.credits,
            room: data.room || "",
            schedule: data.schedule || "",
          })
        } else {
          setMessage({ text: "Course not found", type: "error" })
        }
      } catch (error: any) {
        console.error("Error fetching course:", error)
        setMessage({ text: error.message || "Failed to fetch course data", type: "error" })
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [user, courseId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "credits" ? Number.parseInt(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || user.role !== "admin" || !courseId) return

    try {
      setSubmitting(true)
      setMessage({ text: "", type: "" })

      // Validate form data
      if (!formData.code || !formData.title || !formData.credits) {
        setMessage({ text: "Course code, title, and credits are required", type: "error" })
        return
      }

      // Update course
      const { error } = await supabase
        .from("courses")
        .update({
          code: formData.code,
          title: formData.title,
          description: formData.description || null,
          credits: formData.credits,
          room: formData.room || null,
          schedule: formData.schedule || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", courseId)

      if (error) throw error

      setMessage({ text: "Course updated successfully", type: "success" })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/admin/courses")
      }, 2000)
    } catch (error: any) {
      console.error("Error updating course:", error)
      setMessage({ text: error.message || "Failed to update course", type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Edit Course</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Edit Course</h1>
        <Link href="/dashboard/admin/courses" className="text-purple-500 hover:text-purple-400">
          Back to Courses
        </Link>
      </div>
      <p className="mt-1 text-gray-400">Update course information</p>

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
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-400 mb-1">
                    Course Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    className="input-field"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="e.g., CSE101"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
                    Course Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    className="input-field"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Introduction to Computer Science"
                    required
                  />
                </div>
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
                  placeholder="Enter a description for this course"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label htmlFor="credits" className="block text-sm font-medium text-gray-400 mb-1">
                    Credits <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="credits"
                    name="credits"
                    className="input-field"
                    value={formData.credits}
                    onChange={handleChange}
                    required
                  >
                    {[1, 2, 3, 4, 5, 6].map((credit) => (
                      <option key={credit} value={credit}>
                        {credit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="room" className="block text-sm font-medium text-gray-400 mb-1">
                    Room
                  </label>
                  <input
                    id="room"
                    name="room"
                    type="text"
                    className="input-field"
                    value={formData.room}
                    onChange={handleChange}
                    placeholder="e.g., Room 101"
                  />
                </div>

                <div>
                  <label htmlFor="schedule" className="block text-sm font-medium text-gray-400 mb-1">
                    Schedule
                  </label>
                  <input
                    id="schedule"
                    name="schedule"
                    type="text"
                    className="input-field"
                    value={formData.schedule}
                    onChange={handleChange}
                    placeholder="e.g., Mon, Wed 10:00 AM - 11:30 AM"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard/admin/courses"
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
