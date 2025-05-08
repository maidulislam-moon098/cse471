"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"] & {
  users?: {
    name: string
    email: string
    role: string
  }
}

export default function ActivityLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAction, setFilterAction] = useState<string>("")
  const [filterUser, setFilterUser] = useState<string>("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [uniqueActions, setUniqueActions] = useState<string[]>([])
  const [uniqueUsers, setUniqueUsers] = useState<{ id: string; name: string }[]>([])
  const logsPerPage = 20
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)

        // Get total count for pagination
        const { count, error: countError } = await supabase
          .from("activity_logs")
          .select("*", { count: "exact", head: true })

        if (countError) throw countError

        setTotalPages(Math.ceil((count || 0) / logsPerPage))

        // Build query with filters
        let query = supabase
          .from("activity_logs")
          .select("*, users(name, email, role)")
          .order("created_at", { ascending: false })
          .range((page - 1) * logsPerPage, page * logsPerPage - 1)

        if (filterAction) {
          query = query.eq("action", filterAction)
        }

        if (filterUser) {
          query = query.eq("user_id", filterUser)
        }

        if (searchTerm) {
          query = query.or(`details.ilike.%${searchTerm}%,ip_address.ilike.%${searchTerm}%`)
        }

        const { data, error } = await query

        if (error) throw error

        setLogs(data || [])

        // Fetch unique actions for filter
        const { data: actionsData, error: actionsError } = await supabase
          .from("activity_logs")
          .select("action")
          .order("action")

        if (actionsError) throw actionsError

        const uniqueActionsSet = new Set(actionsData.map((log) => log.action))
        setUniqueActions(Array.from(uniqueActionsSet))

        // Fetch unique users for filter
        const { data: usersData, error: usersError } = await supabase
          .from("activity_logs")
          .select("user_id, users!inner(name)")
          .order("users(name)")

        if (usersError) throw usersError

        const uniqueUsersMap = new Map()
        usersData.forEach((log) => {
          if (log.user_id && log.users) {
            uniqueUsersMap.set(log.user_id, { id: log.user_id, name: log.users.name })
          }
        })
        setUniqueUsers(Array.from(uniqueUsersMap.values()))
      } catch (error) {
        console.error("Error fetching activity logs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [user, page, filterAction, filterUser, searchTerm])

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const formatDetails = (details: any) => {
    if (!details) return "N/A"
    if (typeof details === "string") return details

    try {
      return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
    } catch (e) {
      return JSON.stringify(details)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Activity Logs</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Activity Logs</h1>
      <p className="mt-1 text-gray-400">View system activity and audit trail</p>

      <div className="mt-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="Search logs..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1) // Reset to first page on new search
              }}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="w-full md:w-1/3">
            <select
              className="input-field"
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value)
                setPage(1) // Reset to first page on new filter
              }}
            >
              <option value="">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-1/3">
            <select
              className="input-field"
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value)
                setPage(1) // Reset to first page on new filter
              }}
            >
              <option value="">All Users</option>
              {uniqueUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center mt-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto bg-card rounded-lg border border-gray-800">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Timestamp
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Action
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Details
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.users ? (
                            <div>
                              <div className="text-sm font-medium text-white">{log.users.name}</div>
                              <div className="text-xs text-gray-400">{log.users.email}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">System</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.action.includes("create")
                                ? "bg-green-900 text-green-300"
                                : log.action.includes("delete")
                                  ? "bg-red-900 text-red-300"
                                  : log.action.includes("update")
                                    ? "bg-blue-900 text-blue-300"
                                    : log.action.includes("login")
                                      ? "bg-purple-900 text-purple-300"
                                      : "bg-gray-900 text-gray-300"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300 max-w-md truncate">
                          {formatDetails(log.details)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{log.ip_address}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                        No activity logs found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 bg-gray-800 text-white rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-gray-800 text-white rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
