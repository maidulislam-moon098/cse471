"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function ManageCourses() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [message, setMessage] = useState({ text: "", type: "" })
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

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return
    }

    try {
      // Delete course (should cascade to enrollments, teaching assignments, etc.)
      const { error } = await supabase.from("courses").delete().eq("id", courseId)

      if (error) throw error

      // Update local state
      setCourses(courses.filter((c) => c.id !== courseId))
      setMessage({ text: "Course deleted successfully", type: "success" })
    } catch (error: any) {
      console.error("Error deleting course:", error)
      setMessage({ text: error.message || "Failed to delete course", type: "error" })
    }
  }

  const filteredCourses = courses.filter(
    (course) =>
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Manage Courses</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Manage Courses</h1>
          <p className="mt-1 text-gray-400">View, edit, and remove courses</p>
        </div>
        <Link href="/dashboard/admin/courses/create" className="btn-primary">
          Add New Course
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
              placeholder="Search courses..."
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
                    Code
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                  >
                    Credits
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                  >
                    Room
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                  >
                    Schedule
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
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{course.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{course.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{course.credits}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{course.room || "Not specified"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{course.schedule || "Not specified"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <Link
                            href={`/dashboard/admin/courses/edit/${course.id}`}
                            className="text-purple-500 hover:text-purple-400"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            Delete
                          </button>
                          <Link
                            href={`/dashboard/admin/courses/students/${course.id}`}
                            className="text-blue-500 hover:text-blue-400"
                          >
                            Students
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      {searchTerm
                        ? "No courses found matching your search criteria."
                        : "No courses have been added yet."}
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
