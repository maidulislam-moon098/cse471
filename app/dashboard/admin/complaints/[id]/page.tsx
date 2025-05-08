"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect, type FormEvent } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline"
import type { Database } from "@/types/supabase"

type ComplaintWithUser = Database["public"]["Tables"]["complaints"]["Row"] & {
  users?: {
    name: string
    email: string
    role: string
  } | null
}

export default function AdminComplaintDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const complaintId = params.id as string

  const [complaint, setComplaint] = useState<ComplaintWithUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const [formData, setFormData] = useState({
    status: "",
    resolution_notes: "",
  })

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchComplaint = async () => {
      if (!user || user.role !== "admin" || !complaintId) return

      try {
        setLoading(true)

        const { data, error } = await supabase.from("complaints").select("*").eq("id", complaintId).single()

        if (error) {
          if (error.code === "PGRST116") {
            setError("Complaint not found.")
          } else {
            throw error
          }
        }

        setComplaint(data as ComplaintWithUser)
        setFormData({
          status: data.status,
          resolution_notes: data.resolution_notes || "",
        })
      } catch (err) {
        console.error("Error fetching complaint:", err)
        setError("Failed to load complaint details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchComplaint()
  }, [user, complaintId, supabase])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!user || user.role !== "admin" || !complaint) return

    try {
      setIsUpdating(true)

      const updateData: any = {
        status: formData.status,
        resolution_notes: formData.resolution_notes,
      }

      // If status is changing to resolved or rejected, add resolved_at and resolved_by
      if ((formData.status === "resolved" || formData.status === "rejected") && complaint.status !== formData.status) {
        updateData.resolved_at = new Date().toISOString()
        updateData.resolved_by = user.id
      }

      const { error } = await supabase.from("complaints").update(updateData).eq("id", complaintId)

      if (error) throw error

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "update_complaint_status",
        details: {
          complaint_id: complaintId,
          previous_status: complaint.status,
          new_status: formData.status,
        },
      })

      // Update local state
      setComplaint({
        ...complaint,
        status: formData.status,
        resolution_notes: formData.resolution_notes,
        resolved_at: updateData.resolved_at || complaint.resolved_at,
        resolved_by: updateData.resolved_by || complaint.resolved_by,
      })
    } catch (err) {
      console.error("Error updating complaint:", err)
      setError("Failed to update complaint. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <ClockIcon className="mr-1 h-4 w-4" />
            Pending
          </span>
        )
      case "in-progress":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            In Progress
          </span>
        )
      case "resolved":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircleIcon className="mr-1 h-4 w-4" />
            Resolved
          </span>
        )
      case "rejected":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircleIcon className="mr-1 h-4 w-4" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {status}
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Admin Complaint Management</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center my-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard/admin/complaints"
            className="inline-flex items-center text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Complaints
          </Link>
        </div>

        <div className="bg-red-900/50 border border-red-700 rounded-md p-4 max-w-2xl mx-auto">
          <h2 className="text-lg font-medium text-white mb-2">Error</h2>
          <p className="text-red-200">{error}</p>
          <div className="mt-4">
            <Link
              href="/dashboard/admin/complaints"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Return to Complaints
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard/admin/complaints"
            className="inline-flex items-center text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Complaints
          </Link>
        </div>

        <div className="text-center py-10 bg-card rounded-lg border border-gray-800 max-w-2xl mx-auto">
          <h2 className="text-lg font-medium text-white mb-2">Complaint Not Found</h2>
          <p className="text-gray-400">The complaint you're looking for doesn't exist.</p>
          <div className="mt-4">
            <Link
              href="/dashboard/admin/complaints"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Return to Complaints
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard/admin/complaints"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Complaints
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-card shadow rounded-lg border border-gray-800 overflow-hidden mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-white">{complaint.title}</h3>
              {getStatusBadge(complaint.status)}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">Submitted on {formatDate(complaint.created_at)}</p>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-400">Submitted By</dt>
                <dd className="mt-1 text-sm text-white">
                  {complaint.users?.name || "Unknown"} ({complaint.users?.role || "user"})
                </dd>
              </div>

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-white">{complaint.users?.email || "No email available"}</dd>
              </div>

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-400">Category</dt>
                <dd className="mt-1 text-sm text-white capitalize">{complaint.category}</dd>
              </div>

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-400">Status</dt>
                <dd className="mt-1 text-sm text-white capitalize">{complaint.status}</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-400">Description</dt>
                <dd className="mt-1 text-sm text-white whitespace-pre-line">{complaint.description}</dd>
              </div>

              {complaint.resolved_at && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-400">Resolved On</dt>
                  <dd className="mt-1 text-sm text-white">{formatDate(complaint.resolved_at)}</dd>
                </div>
              )}

              {complaint.resolution_notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-400">Resolution Notes</dt>
                  <dd className="mt-1 text-sm text-white whitespace-pre-line">{complaint.resolution_notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="bg-card shadow rounded-lg border border-gray-800 overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-800">
            <h3 className="text-lg leading-6 font-medium text-white">Update Complaint Status</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              Change the status and add resolution notes for this complaint.
            </p>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-300">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 py-2 px-3 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="resolution_notes" className="block text-sm font-medium text-gray-300">
                    Resolution Notes
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="resolution_notes"
                      name="resolution_notes"
                      rows={4}
                      value={formData.resolution_notes}
                      onChange={handleChange}
                      className="block w-full rounded-md border border-gray-700 bg-gray-800 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm text-white px-3 py-2"
                      placeholder="Add notes about how this complaint was resolved or why it was rejected"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    {formData.status === "resolved" || formData.status === "rejected"
                      ? "Please provide details about the resolution or reason for rejection."
                      : "Optional notes about the current status of this complaint."}
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? (
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
                        Updating...
                      </>
                    ) : (
                      "Update Status"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
