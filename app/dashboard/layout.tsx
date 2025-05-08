"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BellIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  HomeIcon,
  BookOpenIcon,
  CalendarIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAuthenticated, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Determine the assignments link based on user role
  const assignmentsLink = user.role === "faculty" ? "/dashboard/assignments/manage" : "/dashboard/assignments"

  // Determine the classes link based on user role
  const classesLink = user.role === "faculty" ? "/dashboard/faculty/classes" : "/dashboard/classes"

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="bg-[#0a0a12] border-b border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold text-blue-500">UniSync</span>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <div className="relative ml-3">
                  <div className="flex items-center">
                    <button
                      type="button"
                      className="flex max-w-xs items-center rounded-xl bg-card text-sm focus:outline-none"
                      id="user-menu-button"
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-medium">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="ml-2 text-gray-300">{user.name}</span>
                    </button>
                    <button onClick={logout} className="ml-4 text-gray-400 hover:text-white">
                      <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="-mr-2 flex md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-card p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${isMobileMenuOpen ? "block" : "hidden"} md:hidden`}>
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            <Link href="/dashboard" className="block rounded-xl px-3 py-2 text-base font-medium text-white bg-gray-900">
              Dashboard
            </Link>

            {user.role !== "admin" && (
              <>
                <Link
                  href="/dashboard/courses"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Courses
                </Link>
                <Link
                  href={classesLink}
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Classes
                </Link>
                <Link
                  href="/dashboard/notifications"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Notifications
                </Link>
                <Link
                  href={assignmentsLink}
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Assignments
                </Link>
                <Link
                  href="/dashboard/complaints"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Complaints
                </Link>
                <Link
                  href="/dashboard/scholarships"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Scholarships
                </Link>
              </>
            )}

            {user.role === "student" && (
              <>
                <Link
                  href="/dashboard/attendance"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Attendance
                </Link>
                <Link
                  href="/dashboard/grades"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Grades
                </Link>
                <Link
                  href="/dashboard/materials"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Materials
                </Link>
                <Link
                  href="/dashboard/discussions"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Discussions
                </Link>
                <Link
                  href="/dashboard/deadlines"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Deadlines
                </Link>
                <Link
                  href="/dashboard/evaluations"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Evaluations
                </Link>
              </>
            )}

            {user.role === "admin" && (
              <>
                <Link
                  href="/dashboard/admin"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Admin Panel
                </Link>
                <Link
                  href="/dashboard/admin/complaints"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Complaints
                </Link>
                <Link
                  href="/dashboard/admin/scholarships"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Scholarships
                </Link>
                <Link
                  href="/dashboard/admin/evaluations"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Evaluations
                </Link>
              </>
            )}

            <Link
              href="/dashboard/profile"
              className="block rounded-xl px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Profile
            </Link>
          </div>
          <div className="border-t border-gray-800 pb-3 pt-4">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-medium">{user.name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">{user.name}</div>
                <div className="text-sm font-medium leading-none text-gray-400 mt-1">{user.email}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1 px-2">
              <button
                onClick={logout}
                className="block w-full text-left rounded-xl px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-sidebar md:flex-col">
          <div className="flex min-h-0 flex-1 flex-col bg-[#0a0a12] border-r border-gray-800">
            <div className="flex flex-1 flex-col overflow-y-auto pt-8 pb-4">
              <nav className="mt-5 flex-1 space-y-3 px-6">
                <Link
                  href="/dashboard"
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                    pathname === "/dashboard"
                      ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  }`}
                >
                  <HomeIcon className="mr-3 h-6 w-6 text-gray-300" aria-hidden="true" />
                  Dashboard
                </Link>

                {user.role !== "admin" && (
                  <>
                    <Link
                      href="/dashboard/courses"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/courses"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <BookOpenIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Courses
                    </Link>
                    <Link
                      href={classesLink}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname.includes("/dashboard/classes") || pathname.includes("/dashboard/faculty/classes")
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <CalendarIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Classes
                    </Link>
                    <Link
                      href="/dashboard/notifications"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/notifications"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <BellIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Notifications
                    </Link>
                    <Link
                      href={assignmentsLink}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname.includes("/dashboard/assignments")
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-3 h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Assignments
                    </Link>
                    <Link
                      href="/dashboard/complaints"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname.includes("/dashboard/complaints")
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <ExclamationTriangleIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Complaints
                    </Link>
                    <Link
                      href="/dashboard/scholarships"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname.includes("/dashboard/scholarships")
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="mr-3 h-6 w-6 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
                        />
                      </svg>
                      Scholarships
                    </Link>
                  </>
                )}

                {user.role === "student" && (
                  <>
                    <Link
                      href="/dashboard/attendance"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/attendance"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <ClipboardDocumentListIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Attendance
                    </Link>
                    <Link
                      href="/dashboard/grades"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/grades"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="mr-3 h-6 w-6 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                        />
                      </svg>
                      Grades
                    </Link>
                    <Link
                      href="/dashboard/materials"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname.includes("/dashboard/materials")
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="mr-3 h-6 w-6 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 7.5l3 3m-3-3l-3 3m4.5-10.5h-1.06a3 3 0 10-2.87-2.87l-1.063-.45c-.163-.067-.366-.104-.577-.104H5.25a2.25 2.25 0 00-2.25 2.25v12a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25V11.25a2.25 2.25 0 00-2.25-2.25z"
                        />
                      </svg>
                      Materials
                    </Link>
                    <Link
                      href="/dashboard/discussions"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/discussions"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="mr-3 h-6 w-6 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-1.5 2.25h.008v.008h-.008V12zm-9 1.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-1.5 2.25h.008v.008h-.008V16.5zm-6 1.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-1.5 2.25h.008v.008h-.008v-.008z"
                        />
                        <path d="M5.25 18a6.75 6.75 0 00-1.5 9m9 0h-9m1.5-14.25a6.75 6.75 0 011.5 9m9 0h-9m1.5-14.25a6.75 6.75 0 00-1.5 9m9 0H12" />
                      </svg>
                      Discussions
                    </Link>
                    <Link
                      href="/dashboard/deadlines"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/deadlines"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="mr-3 h-6 w-6 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 12L3.269 3.188A9 9 0 0118.731 3.188L16 12m-2 9v-1.5a.375.375 0 01.375-.375h1.5a.375.375 0 01.375.375V21m-3-3h.008v.008H12V18z"
                        />
                      </svg>
                      Deadlines
                    </Link>
                    <Link
                      href="/dashboard/evaluations"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/evaluations"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="mr-3 h-6 w-6 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                      Evaluations
                    </Link>
                  </>
                )}

                {user.role === "admin" && (
                  <>
                    <Link
                      href="/dashboard/admin"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/admin"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <Cog6ToothIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Admin Panel
                    </Link>
                    <Link
                      href="/dashboard/admin/complaints"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname.includes("/dashboard/admin/complaints")
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <ExclamationTriangleIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Complaints
                    </Link>
                    <Link
                      href="/dashboard/admin/students/bulk"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/admin/students/bulk"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <UsersIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Bulk Operations
                    </Link>
                    <Link
                      href="/dashboard/admin/announcements"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname.includes("/dashboard/admin/announcements")
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <BellIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Announcements
                    </Link>
                    <Link
                      href="/dashboard/admin/reports"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/admin/reports"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <ChartBarIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Reports
                    </Link>
                    <Link
                      href="/dashboard/admin/export"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/admin/export"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <ArrowDownTrayIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Data Export
                    </Link>
                    <Link
                      href="/dashboard/admin/logs"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname === "/dashboard/admin/logs"
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <ClipboardDocumentListIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                      Activity Logs
                    </Link>
                    <Link
                      href="/dashboard/admin/scholarships"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname.includes("/dashboard/admin/scholarships")
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="mr-3 h-6 w-6 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
                        />
                      </svg>
                      Scholarships
                    </Link>
                    <Link
                      href="/dashboard/admin/evaluations"
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                        pathname.includes("/dashboard/admin/evaluations")
                          ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="mr-3 h-6 w-6 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                      Evaluations
                    </Link>
                  </>
                )}

                <Link
                  href="/dashboard/profile"
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                    pathname === "/dashboard/profile"
                      ? "text-white bg-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  }`}
                >
                  <UserIcon className="mr-3 h-6 w-6 text-gray-400" aria-hidden="true" />
                  Profile
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 bg-background">
          <div className="py-8">
            <div className="mx-auto max-w-7xl px-6 sm:px-8 md:px-10">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
