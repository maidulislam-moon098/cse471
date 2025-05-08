"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline"
import type { Database } from "@/types/supabase"

type Complaint = Database["public"]["Tables"]["complaints"]["Row"]

export default function ComplaintDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const complaintId = params.id as string

  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchComplaint = async () => {
      if (!user || !complaintId) return

      try {
        setLoading(true)

        const { data, error } = await supabase
          .from("complaints")
          .select("*")
          .eq("id", complaintId)
          .eq("user_id", user.id)
          .single()

        if (error) {
          if (error.code === "PGRST116") {
            setError("Complaint not found or you don't have permission to view it.")
          } else {
            throw error
          }
        }

        setComplaint(data)
      } catch (err) {
        console.error("Error fetching complaint:", err)
        setError("Failed to load complaint details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchComplaint()
  }, [user, complaintId, supabase])

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
            href="/dashboard/complaints"
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
              href="/dashboard/complaints"
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
            href="/dashboard/complaints"
            className="inline-flex items-center text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Complaints
          </Link>
        </div>

        <div className="text-center py-10 bg-card rounded-lg border border-gray-800 max-w-2xl mx-auto">
          <h2 className="text-lg font-medium text-white mb-2">Complaint Not Found</h2>
          <p className="text-gray-400">
            The complaint you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/complaints"
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
        <Link href="/dashboard/complaints" className="inline-flex items-center text-sm text-gray-400 hover:text-white">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Complaints
        </Link>
      </div>

      <div className="max-w-3xl mx-auto bg-card shadow rounded-lg border border-gray-800 overflow-hidden">
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

            {complaint.status === "resolved" && (
              <>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-400">Resolved On</dt>
                  <dd className="mt-1 text-sm text-white">
                    {complaint.resolved_at ? formatDate(complaint.resolved_at) : "N/A"}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-400">Resolution Notes</dt>
                  <dd className="mt-1 text-sm text-white whitespace-pre-line">
                    {complaint.resolution_notes || "No resolution notes provided."}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
