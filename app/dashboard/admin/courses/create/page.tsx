"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function CreateCourse() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    credits: 3,
    room: "",
    schedule: "",
  })
  const supabase = getSupabaseBrowserClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "credits" ? Number.parseInt(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || user.role !== "admin") return

    try {
      setLoading(true)
      setMessage({ text: "", type: "" })

      // Validate form data
      if (!formData.code || !formData.title || !formData.credits) {
        setMessage({ text: "Please fill in all required fields", type: "error" })
        return
      }

      // Create course
      const { data, error } = await supabase
        .from("courses")
        .insert({
          code: formData.code,
          title: formData.title,
          description: formData.description,
          credits: formData.credits,
          room: formData.room,
          schedule: formData.schedule,
        })
        .select()

      if (error) throw error

      setMessage({ text: "Course created successfully", type: "success" })

      // Reset form
      setFormData({
        code: "",
        title: "",
        description: "",
        credits: 3,
        room: "",
        schedule: "",
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/admin/courses")
      }, 2000)
    } catch (error: any) {
      console.error("Error creating course:", error)
      setMessage({ text: error.message || "Failed to create course", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Create Course</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Create New Course</h1>
      <p className="mt-1 text-gray-400">Add a new course to the system</p>

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

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Course"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
