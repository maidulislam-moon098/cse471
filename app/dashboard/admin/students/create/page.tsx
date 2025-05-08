"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function CreateStudent() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [debug, setDebug] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    department: "",
    is_verified: true,
  })

  const supabase = getSupabaseBrowserClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    if (!user || user.role !== "admin") return

    try {
      setLoading(true)
      setMessage({ text: "", type: "" })
      setDebug("Starting student creation process...")

      // Validate form data
      if (!formData.name || !formData.email || !formData.password) {
        setMessage({ text: "Name, email, and password are required", type: "error" })
        return
      }

      if (formData.password !== formData.confirmPassword) {
        setMessage({ text: "Passwords do not match", type: "error" })
        return
      }

      setDebug(`Creating user with email: ${formData.email}`)

      // First, check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle()

      if (checkError) {
        setDebug(`Error checking existing user: ${JSON.stringify(checkError)}`)
      }

      if (existingUser) {
        setMessage({ text: "A user with this email already exists", type: "error" })
        setDebug(`User already exists with id: ${existingUser.id}`)
        setLoading(false)
        return
      }

      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: "student",
          },
        },
      })

      if (authError) {
        setDebug(`Auth error: ${JSON.stringify(authError)}`)
        throw authError
      }

      setDebug(`Auth successful, user created with id: ${authData.user?.id}`)

      if (authData.user) {
        // Create user profile in the users table
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .insert({
            id: authData.user.id,
            email: formData.email,
            name: formData.name,
            role: "student",
            phone: formData.phone || null,
            department: formData.department || null,
            is_verified: formData.is_verified,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()

        if (profileError) {
          setDebug(`Profile error: ${JSON.stringify(profileError)}`)
          throw profileError
        }

        setDebug(`Profile created successfully: ${JSON.stringify(profileData)}`)
        setMessage({ text: "Student created successfully", type: "success" })

        // Reset form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          department: "",
          is_verified: true,
        })

        // Redirect after a short delay
        setTimeout(() => {
          router.push("/dashboard/admin/students")
        }, 2000)
      }
    } catch (error: any) {
      console.error("Error creating student:", error)
      setDebug(`Error in handleSubmit: ${JSON.stringify(error)}`)
      setMessage({ text: error.message || "Failed to create student", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Create Student</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Create New Student</h1>
        <Link href="/dashboard/admin/students" className="text-purple-500 hover:text-purple-400">
          Back to Students
        </Link>
      </div>
      <p className="mt-1 text-gray-400">Add a new student to the system</p>

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
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="input-field"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="input-field"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
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
                Mark as Email Verified (Skip verification email)
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href="/dashboard/admin/students"
                className="px-4 py-2 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Link>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Student"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
