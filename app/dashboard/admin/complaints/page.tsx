"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline"
import type { Database } from "@/types/supabase"

type ComplaintWithUser = Database["public"]["Tables"]["complaints"]["Row"] & {
  users?: {
    name: string
    email: string
    role: string
  } | null
}

export default function AdminComplaintsPage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState<ComplaintWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)
        let query = supabase.from("complaints").select("*").order("created_at", { ascending: false })

        if (filter !== "all") {
          query = query.eq("status", filter)
        }

        const { data, error } = await query

        if (error) {
          console.error("Error details:", error)
          throw error
        }
        setComplaints(data || [])
      } catch (error) {
        console.error("Error fetching complaints:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchComplaints()
  }, [user, supabase, filter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <ClockIcon className="mr-1 h-3 w-3" />
            Pending
          </span>
        )
      case "in-progress":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <svg
              className="mr-1 h-3 w-3"
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircleIcon className="mr-1 h-3 w-3" />
            Resolved
          </span>
        )
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircleIcon className="mr-1 h-3 w-3" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {status}
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Admin Complaints Dashboard</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-6">Complaints Dashboard</h1>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === "all" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === "pending" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("in-progress")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === "in-progress" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === "resolved" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === "rejected" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : complaints.length > 0 ? (
        <div className="bg-card shadow overflow-hidden sm:rounded-md border border-gray-800">
          <ul className="divide-y divide-gray-800">
            {complaints.map((complaint) => (
              <li key={complaint.id}>
                <Link
                  href={`/dashboard/admin/complaints/${complaint.id}`}
                  className="block hover:bg-gray-800 transition duration-150 ease-in-out"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white truncate">{complaint.title}</p>
                      <div className="ml-2 flex-shrink-0 flex">{getStatusBadge(complaint.status)}</div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-400">
                          <span className="capitalize">{complaint.category}</span>
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-400 sm:mt-0 sm:ml-6">
                          <span>
                            By: {complaint.users?.name || "Unknown"} ({complaint.users?.role || "user"})
                          </span>
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-400 sm:mt-0">
                        <p>Submitted on {formatDate(complaint.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-10 bg-card rounded-lg border border-gray-800">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-white">No complaints found</h3>
          <p className="mt-1 text-sm text-gray-400">
            {filter === "all"
              ? "There are no complaints in the system yet."
              : `There are no complaints with status "${filter}".`}
          </p>
        </div>
      )}
    </div>
  )
}
