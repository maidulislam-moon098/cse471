"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, type FormEvent } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"

export default function CreateComplaintPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "academic",
  })

  const [errors, setErrors] = useState<{
    title?: string
    description?: string
    category?: string
    general?: string
  }>({})

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    } else if (formData.title.length < 5) {
      newErrors.title = "Title must be at least 5 characters"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    } else if (formData.description.length < 20) {
      newErrors.description = "Description must be at least 20 characters"
    }

    if (!formData.category) {
      newErrors.category = "Category is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!user) {
      router.push("/login")
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)

      const { data, error } = await supabase.from("complaints").insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        status: "pending",
      })

      if (error) throw error

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "create_complaint",
        details: { complaint_title: formData.title },
      })

      router.push("/dashboard/complaints")
    } catch (error) {
      console.error("Error submitting complaint:", error)
      setErrors((prev) => ({ ...prev, general: "Failed to submit complaint. Please try again." }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/complaints" className="inline-flex items-center text-sm text-gray-400 hover:text-white">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Complaints
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-white mb-6">Submit a Complaint</h1>

        {errors.general && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-red-200">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card shadow rounded-lg border border-gray-800 p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300">
                Title
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`block w-full rounded-md border ${
                    errors.title ? "border-red-500" : "border-gray-700"
                  } bg-gray-800 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm text-white px-3 py-2`}
                  placeholder="Brief title of your complaint"
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-300">
                Category
              </label>
              <div className="mt-1">
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`block w-full rounded-md border ${
                    errors.category ? "border-red-500" : "border-gray-700"
                  } bg-gray-800 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm text-white px-3 py-2`}
                >
                  <option value="academic">Academic</option>
                  <option value="technical">Technical</option>
                  <option value="administrative">Administrative</option>
                  <option value="facilities">Facilities</option>
                  <option value="other">Other</option>
                </select>
                {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                Description
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  value={formData.description}
                  onChange={handleChange}
                  className={`block w-full rounded-md border ${
                    errors.description ? "border-red-500" : "border-gray-700"
                  } bg-gray-800 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm text-white px-3 py-2`}
                  placeholder="Provide detailed information about your complaint"
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Please provide as much detail as possible to help us address your complaint effectively.
              </p>
            </div>

            <div className="flex justify-end">
              <Link
                href="/dashboard/complaints"
                className="mr-4 inline-flex justify-center py-2 px-4 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
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
                    Submitting...
                  </>
                ) : (
                  "Submit Complaint"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
