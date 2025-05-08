"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]

export default function ManageTutors() {
  const { user } = useAuth()
  const [tutors, setTutors] = useState<UserProfile[]>([])
  const [pendingTutors, setPendingTutors] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [message, setMessage] = useState({ text: "", type: "" })
  const [debug, setDebug] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchTutors = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)
        setDebug("Fetching tutors...")

        // Fetch approved tutors
        const { data: approvedTutors, error: approvedError } = await supabase
          .from("users")
          .select("*")
          .eq("role", "student")
          .eq("is_tutor", true)
          .order("name")

        if (approvedError) {
          setDebug(`Error fetching approved tutors: ${JSON.stringify(approvedError)}`)
          throw approvedError
        }

        setDebug(`Fetched ${approvedTutors?.length || 0} approved tutors`)
        setTutors(approvedTutors || [])

        // Fetch pending tutor applications
        const { data: pendingData, error: pendingError } = await supabase
          .from("users")
          .select("*")
          .eq("role", "student")
          .eq("tutor_application_status", "pending")
          .order("name")

        if (pendingError) {
          setDebug(`Error fetching pending tutors: ${JSON.stringify(pendingError)}`)
          throw pendingError
        }

        setDebug(`Fetched ${pendingData?.length || 0} pending tutor applications`)
        setPendingTutors(pendingData || [])
      } catch (error) {
        console.error("Error fetching tutors:", error)
        setDebug(`Error in fetchTutors: ${JSON.stringify(error)}`)
      } finally {
        setLoading(false)
      }
    }

    fetchTutors()
  }, [user])

  const handleApproveTutor = async (studentId: string) => {
    try {
      setActionLoading(true)
      setMessage({ text: "", type: "" })
      setDebug(`Approving tutor application for student ${studentId}`)

      // Update user record
      const { data, error } = await supabase
        .from("users")
        .update({
          is_tutor: true,
          tutor_application_status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId)
        .select()

      if (error) {
        setDebug(`Error approving tutor: ${JSON.stringify(error)}`)
        throw error
      }

      setDebug(`Tutor approved successfully: ${JSON.stringify(data)}`)

      // Update local state
      const approvedStudent = pendingTutors.find((s) => s.id === studentId)
      if (approvedStudent) {
        const updatedStudent = { ...approvedStudent, is_tutor: true, tutor_application_status: "approved" }
        setTutors([...tutors, updatedStudent])
        setPendingTutors(pendingTutors.filter((s) => s.id !== studentId))
      }

      setMessage({ text: "Tutor application approved successfully", type: "success" })
    } catch (error: any) {
      console.error("Error approving tutor:", error)
      setMessage({ text: error.message || "Failed to approve tutor application", type: "error" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectTutor = async (studentId: string) => {
    try {
      setActionLoading(true)
      setMessage({ text: "", type: "" })
      setDebug(`Rejecting tutor application for student ${studentId}`)

      // Update user record
      const { data, error } = await supabase
        .from("users")
        .update({
          is_tutor: false,
          tutor_application_status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId)
        .select()

      if (error) {
        setDebug(`Error rejecting tutor: ${JSON.stringify(error)}`)
        throw error
      }

      setDebug(`Tutor rejected successfully: ${JSON.stringify(data)}`)

      // Update local state
      setPendingTutors(pendingTutors.filter((s) => s.id !== studentId))

      setMessage({ text: "Tutor application rejected successfully", type: "success" })
    } catch (error: any) {
      console.error("Error rejecting tutor:", error)
      setMessage({ text: error.message || "Failed to reject tutor application", type: "error" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeTutor = async (tutorId: string) => {
    if (!confirm("Are you sure you want to revoke this student's tutor status?")) {
      return
    }

    try {
      setActionLoading(true)
      setMessage({ text: "", type: "" })
      setDebug(`Revoking tutor status for student ${tutorId}`)

      // Update user record
      const { data, error } = await supabase
        .from("users")
        .update({
          is_tutor: false,
          tutor_application_status: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tutorId)
        .select()

      if (error) {
        setDebug(`Error revoking tutor: ${JSON.stringify(error)}`)
        throw error
      }

      setDebug(`Tutor status revoked successfully: ${JSON.stringify(data)}`)

      // Update local state
      setTutors(tutors.filter((t) => t.id !== tutorId))

      setMessage({ text: "Tutor status revoked successfully", type: "success" })
    } catch (error: any) {
      console.error("Error revoking tutor status:", error)
      setMessage({ text: error.message || "Failed to revoke tutor status", type: "error" })
    } finally {
      setActionLoading(false)
    }
  }

  const filteredTutors = tutors.filter(
    (tutor) =>
      tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tutor.department && tutor.department.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Manage Student Tutors</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Manage Student Tutors</h1>
      <p className="mt-1 text-gray-400">Approve, reject, and manage student tutor applications</p>

      {debug && (
        <div className="mt-4 p-3 bg-gray-800 rounded text-xs font-mono text-gray-300 max-h-32 overflow-auto">
          <p>Debug Info:</p>
          <pre>{debug}</pre>
        </div>
      )}

      {message.text && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* Pending Applications */}
          <div>
            <h2 className="text-xl font-medium text-white mb-4">Pending Tutor Applications</h2>
            {pendingTutors.length > 0 ? (
              <div className="overflow-x-auto bg-card rounded-lg border border-gray-800">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Student
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Department
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {pendingTutors.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                              <span className="text-white font-medium">{student.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white">{student.name}</div>
                              <div className="text-sm text-gray-400">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{student.department || "Not specified"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleApproveTutor(student.id)}
                              disabled={actionLoading}
                              className="text-green-500 hover:text-green-400"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectTutor(student.id)}
                              disabled={actionLoading}
                              className="text-red-500 hover:text-red-400"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
                <p className="text-gray-400">No pending tutor applications.</p>
              </div>
            )}
          </div>

          {/* Current Tutors */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium text-white">Current Tutors</h2>
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search tutors..."
                  className="input-field pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
            </div>

            {filteredTutors.length > 0 ? (
              <div className="overflow-x-auto bg-card rounded-lg border border-gray-800">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Tutor
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Department
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredTutors.map((tutor) => (
                      <tr key={tutor.id} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                              <span className="text-white font-medium">{tutor.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white">{tutor.name}</div>
                              <div className="text-sm text-gray-400">{tutor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{tutor.department || "Not specified"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleRevokeTutor(tutor.id)}
                              disabled={actionLoading}
                              className="text-red-500 hover:text-red-400"
                            >
                              Revoke Tutor Status
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
                <p className="text-gray-400">
                  {searchTerm ? "No tutors found matching your search criteria." : "No tutors have been approved yet."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
