"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function SendAnnouncement() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    courseId: "",
    sendToAll: true,
  })
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)

        const { data, error } = await supabase.from("courses").select("*").order("code")

        if (error) throw error

        setCourses(data || [])
      } catch (error) {
        console.error("Error fetching courses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement

    if (name === "sendToAll") {
      setFormData((prev) => ({
        ...prev,
        sendToAll: (e.target as HTMLInputElement).checked,
        courseId: (e.target as HTMLInputElement).checked ? "" : prev.courseId,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSending(true)
      setMessage({ text: "", type: "" })

      // Validate form data
      if (!formData.title || !formData.content) {
        setMessage({ text: "Title and content are required", type: "error" })
        setSending(false)
        return
      }

      // Prepare the request payload
      const payload = {
        title: formData.title,
        content: formData.content,
        courseId: formData.sendToAll ? null : formData.courseId,
        senderId: user.id,
      }

      console.log("Sending announcement with payload:", payload)

      // Simple fetch with better error handling
      try {
        const response = await fetch("/api/announcements/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        let responseData
        const responseText = await response.text()

        try {
          responseData = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", responseText)
          throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`)
        }

        if (!response.ok) {
          console.error("Error response:", responseData)
          throw new Error(responseData.error || "Failed to send announcement")
        }

        console.log("Announcement sent successfully:", responseData)

        // Success case
        setMessage({
          text: "Announcement sent successfully to notification panels",
          type: "success",
        })

        // Reset form
        setFormData({
          title: "",
          content: "",
          courseId: "",
          sendToAll: true,
        })
      } catch (fetchError: any) {
        console.error("Fetch error:", fetchError)
        throw fetchError
      }
    } catch (error: any) {
      console.error("Error sending announcement:", error)
      setMessage({
        text: error.message || "Failed to send announcement",
        type: "error",
      })
    } finally {
      setSending(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Send Announcement</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Send Announcement</h1>
      <p className="mt-1 text-gray-400">Create announcements for students and faculty</p>

      {message.text && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 bg-card p-6 rounded-lg border border-gray-800">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
                Announcement Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className="input-field"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">
                Announcement Content
              </label>
              <textarea
                id="content"
                name="content"
                rows={6}
                className="input-field"
                value={formData.content}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            <div>
              <div className="flex items-center mb-4">
                <input
                  id="sendToAll"
                  name="sendToAll"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-600"
                  checked={formData.sendToAll}
                  onChange={handleChange}
                />
                <label htmlFor="sendToAll" className="ml-3 text-sm text-gray-300">
                  Send to all users
                </label>
              </div>

              {!formData.sendToAll && (
                <div>
                  <label htmlFor="courseId" className="block text-sm font-medium text-gray-400 mb-1">
                    Select Course
                  </label>
                  <select
                    id="courseId"
                    name="courseId"
                    className="input-field"
                    value={formData.courseId}
                    onChange={handleChange}
                    required={!formData.sendToAll}
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <button type="submit" className="btn-primary" disabled={sending}>
              {sending ? "Sending..." : "Send Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
