"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]

export default function EditStudent() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: "",
    email: "",
    phone: "",
    department: "",
    bio: "",
    is_verified: false,
  })

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchStudent = async () => {
      if (!user || user.role !== "admin" || !studentId) return

      try {
        setLoading(true)

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", studentId)
          .eq("role", "student")
          .single()

        if (error) throw error

        if (data) {
          setFormData({
            name: data.name,
            email: data.email,
            phone: data.phone || "",
            department: data.department || "",
            bio: data.bio || "",
            is_verified: data.is_verified,
          })
        } else {
          setMessage({ text: "Student not found", type: "error" })
        }
      } catch (error: any) {
        console.error("Error fetching student:", error)
        setMessage({ text: error.message || "Failed to fetch student data", type: "error" })
      } finally {
        setLoading(false)
      }
    }

    fetchStudent()
  }, [user, studentId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === "checkbox") {
      const checkbox = e.target as HTMLInputElement
      setFormData((prev) => ({ ...prev, [name]: checkbox.checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || user.role !== "admin" || !studentId) return

    try {
      setSubmitting(true)
      setMessage({ text: "", type: "" })

      // Validate form data
      if (!formData.name || !formData.email) {
        setMessage({ text: "Name and email are required", type: "error" })
        return
      }

      // Update student profile
      const { error } = await supabase
        .from("users")
        .update({
          name: formData.name,
          phone: formData.phone || null,
          department: formData.department || null,
          bio: formData.bio || null,
          is_verified: formData.is_verified,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId)

      if (error) throw error

      setMessage({ text: "Student updated successfully", type: "success" })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/admin/students")
      }, 2000)
    } catch (error: any) {
      console.error("Error updating student:", error)
      setMessage({ text: error.message || "Failed to update student", type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Edit Student</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Edit Student</h1>
        <Link href="/dashboard/admin/students" className="text-purple-500 hover:text-purple-400">
          Back to Students
        </Link>
      </div>
      <p className="mt-1 text-gray-400">Update student information</p>

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
                  <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="input-field"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={handleChange}
                    disabled
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-1">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    className="input-field"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-400 mb-1">
                    Department
                  </label>
                  <input
                    id="department"
                    name="department"
                    type="text"
                    className="input-field"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  className="input-field"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  id="is_verified"
                  name="is_verified"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  checked={formData.is_verified}
                  onChange={handleChange}
                />
                <label htmlFor="is_verified" className="ml-2 block text-sm text-gray-400">
                  Email Verified
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard/admin/students"
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
