"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"

export default function AdminPanel() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    students: 0,
    faculty: 0,
    courses: 0,
    sessions: 0,
    pendingComplaints: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)

        // Fetch student count
        const { count: studentCount, error: studentError } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("role", "student")

        if (studentError) throw studentError

        // Fetch faculty count
        const { count: facultyCount, error: facultyError } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("role", "faculty")

        if (facultyError) throw facultyError

        // Fetch course count
        const { count: courseCount, error: courseError } = await supabase
          .from("courses")
          .select("*", { count: "exact", head: true })

        if (courseError) throw courseError

        // Fetch session count
        const { count: sessionCount, error: sessionError } = await supabase
          .from("class_sessions")
          .select("*", { count: "exact", head: true })

        if (sessionError) throw sessionError

        // Fetch pending complaints count
        const { count: pendingComplaintsCount, error: complaintsError } = await supabase
          .from("complaints")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")

        if (complaintsError) throw complaintsError

        setStats({
          students: studentCount || 0,
          faculty: facultyCount || 0,
          courses: courseCount || 0,
          sessions: sessionCount || 0,
          pendingComplaints: pendingComplaintsCount || 0,
        })
      } catch (error) {
        console.error("Error fetching admin data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase])

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Admin Panel</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Admin Panel</h1>
      <p className="mt-1 text-gray-400">Manage users, courses, and class sessions</p>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Total Students</h3>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.students}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Total Faculty</h3>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.faculty}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Total Courses</h3>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.courses}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Scheduled Classes</h3>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.sessions}</p>
            </div>
            <div
              className={`bg-card p-6 rounded-lg border ${stats.pendingComplaints > 0 ? "border-yellow-600" : "border-gray-800"}`}
            >
              <h3 className="text-sm font-medium text-gray-400">Pending Complaints</h3>
              <p
                className={`mt-2 text-3xl font-semibold ${stats.pendingComplaints > 0 ? "text-yellow-500" : "text-white"}`}
              >
                {stats.pendingComplaints}
              </p>
              {stats.pendingComplaints > 0 && (
                <Link
                  href="/dashboard/admin/complaints?filter=pending"
                  className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 inline-flex items-center"
                >
                  View pending complaints
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {/* Admin Actions */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-white mb-4">Administrative Actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-card p-6 rounded-lg border border-gray-800">
                <h3 className="text-md font-medium text-white">User Management</h3>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/dashboard/admin/students"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Manage Students
                  </Link>
                  <Link
                    href="/dashboard/admin/faculty"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Manage Faculty
                  </Link>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-gray-800">
                <h3 className="text-md font-medium text-white">Course Management</h3>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/dashboard/admin/courses"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    View All Courses
                  </Link>
                  <Link
                    href="/dashboard/admin/courses/create"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Create New Course
                  </Link>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-gray-800">
                <h3 className="text-md font-medium text-white">Class Management</h3>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/dashboard/admin/classes"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    View All Classes
                  </Link>
                  <Link
                    href="/dashboard/admin/classes/create"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Schedule New Class
                  </Link>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-gray-800">
                <h3 className="text-md font-medium text-white">Assignment Management</h3>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/dashboard/admin/students/assign"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Assign Students to Courses
                  </Link>
                  <Link
                    href="/dashboard/admin/faculty/assign"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Assign Faculty to Courses
                  </Link>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-gray-800">
                <h3 className="text-md font-medium text-white">Complaints</h3>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/dashboard/admin/complaints"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    View All Complaints
                  </Link>
                  <Link
                    href="/dashboard/admin/complaints?filter=pending"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Pending Complaints
                  </Link>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-gray-800">
                <h3 className="text-md font-medium text-white">Scholarships</h3>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/dashboard/admin/scholarships"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    View All Scholarships
                  </Link>
                  <Link
                    href="/dashboard/admin/scholarships/create"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Create New Scholarship
                  </Link>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-gray-800">
                <h3 className="text-md font-medium text-white">Reports</h3>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/dashboard/admin/attendance"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Attendance Reports
                  </Link>
                  <Link
                    href="/dashboard/admin/reports"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    System Reports
                  </Link>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-gray-800">
                <h3 className="text-md font-medium text-white">System</h3>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/dashboard/admin/settings"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    System Settings
                  </Link>
                  <Link
                    href="/dashboard/admin/logs"
                    className="block w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
                  >
                    Activity Logs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
