"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]

export default function ManageFaculty() {
  const { user } = useAuth()
  const [faculty, setFaculty] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [message, setMessage] = useState({ text: "", type: "" })
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchFaculty = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)

        const { data, error } = await supabase.from("users").select("*").eq("role", "faculty").order("name")

        if (error) throw error

        setFaculty(data || [])
      } catch (error) {
        console.error("Error fetching faculty:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFaculty()
  }, [user])

  const handleDeleteFaculty = async (facultyId: string) => {
    if (!confirm("Are you sure you want to delete this faculty member? This action cannot be undone.")) {
      return
    }

    try {
      // First delete from Supabase Auth
      const { data: userData, error: userError } = await supabase.auth.admin.deleteUser(facultyId)

      if (userError) throw userError

      // Then delete from users table (should cascade due to foreign key constraints)
      const { error: deleteError } = await supabase.from("users").delete().eq("id", facultyId)

      if (deleteError) throw deleteError

      // Update local state
      setFaculty(faculty.filter((f) => f.id !== facultyId))
      setMessage({ text: "Faculty member deleted successfully", type: "success" })
    } catch (error: any) {
      console.error("Error deleting faculty member:", error)
      setMessage({ text: error.message || "Failed to delete faculty member", type: "error" })
    }
  }

  const filteredFaculty = faculty.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.department && f.department.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Manage Faculty</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Manage Faculty</h1>
          <p className="mt-1 text-gray-400">View, edit, and remove faculty accounts</p>
        </div>
        <Link href="/dashboard/admin/faculty/create" className="btn-primary">
          Add New Faculty
        </Link>
      </div>

      {message.text && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search faculty..."
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

        {loading ? (
          <div className="flex justify-center mt-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-card rounded-lg border border-gray-800">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                  >
                    Email
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
                    Verified
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
                {filteredFaculty.length > 0 ? (
                  filteredFaculty.map((facultyMember) => (
                    <tr key={facultyMember.id} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                            <span className="text-white font-medium">{facultyMember.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{facultyMember.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{facultyMember.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{facultyMember.department || "Not specified"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            facultyMember.is_verified ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"
                          }`}
                        >
                          {facultyMember.is_verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <Link
                            href={`/dashboard/admin/faculty/edit/${facultyMember.id}`}
                            className="text-purple-500 hover:text-purple-400"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteFaculty(facultyMember.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            Delete
                          </button>
                          <Link
                            href={`/dashboard/admin/faculty/courses/${facultyMember.id}`}
                            className="text-blue-500 hover:text-blue-400"
                          >
                            Courses
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                      {searchTerm
                        ? "No faculty members found matching your search criteria."
                        : "No faculty members have been added yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
