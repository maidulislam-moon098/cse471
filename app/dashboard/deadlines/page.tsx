"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import type { Database } from "@/types/supabase"

type Course = Database["public"]["Tables"]["courses"]["Row"]
type Deadline = {
  id: string
  title: string
  description: string | null
  due_date: string
  course_id: string
  created_at: string
  updated_at: string
  course_code: string
  course_title: string
  days_remaining: number
  hours_remaining: number
  minutes_remaining: number
  is_overdue: boolean
}

export default function Deadlines() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showPast, setShowPast] = useState(false)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch courses based on user role
        let coursesQuery = supabase.from("courses").select("*").order("code")

        if (user.role === "student") {
          // Get courses the student is enrolled in
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("user_id", user.id)

          if (enrollmentsError) throw enrollmentsError

          if (enrollments && enrollments.length > 0) {
            const courseIds = enrollments.map((e) => e.course_id)
            coursesQuery = coursesQuery.in("id", courseIds)
          } else {
            // Student not enrolled in any courses
            setCourses([])
            setDeadlines([])
            setLoading(false)
            return
          }
        } else if (user.role === "faculty") {
          // Get courses the faculty teaches
          const { data: teachings, error: teachingsError } = await supabase
            .from("teaching_assignments")
            .select("course_id")
            .eq("user_id", user.id)

          if (teachingsError) throw teachingsError

          if (teachings && teachings.length > 0) {
            const courseIds = teachings.map((t) => t.course_id)
            coursesQuery = coursesQuery.in("id", courseIds)
          } else {
            // Faculty not teaching any courses
            setCourses([])
            setDeadlines([])
            setLoading(false)
            return
          }
        }

        // Execute courses query
        const { data: coursesData, error: coursesError } = await coursesQuery

        if (coursesError) throw coursesError

        setCourses(coursesData || [])

        // Fetch deadlines
        let deadlinesQuery = supabase
          .from("deadlines")
          .select(
            `
            *,
            courses!deadlines_course_id_fkey (code, title)
          `,
          )
          .order("due_date", { ascending: true })

        if (user.role === "student" && coursesData) {
          const courseIds = coursesData.map((c) => c.id)
          deadlinesQuery = deadlinesQuery.in("course_id", courseIds)
        } else if (user.role === "faculty" && coursesData) {
          const courseIds = coursesData.map((c) => c.id)
          deadlinesQuery = deadlinesQuery.in("course_id", courseIds)
        }

        const { data: deadlinesData, error: deadlinesError } = await deadlinesQuery

        if (deadlinesError) throw deadlinesError

        if (deadlinesData) {
          const now = new Date()
          const formattedDeadlines = deadlinesData.map((deadline: any) => {
            const dueDate = new Date(deadline.due_date)
            const diffMs = dueDate.getTime() - now.getTime()
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

            return {
              id: deadline.id,
              title: deadline.title,
              description: deadline.description,
              due_date: deadline.due_date,
              course_id: deadline.course_id,
              created_at: deadline.created_at,
              updated_at: deadline.updated_at,
              course_code: deadline.courses?.code || "Unknown",
              course_title: deadline.courses?.title || "Unknown",
              days_remaining: diffDays,
              hours_remaining: diffHours,
              minutes_remaining: diffMinutes,
              is_overdue: diffMs < 0,
            }
          })

          setDeadlines(formattedDeadlines)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up interval to update countdown timers
    const intervalId = setInterval(() => {
      const now = new Date()
      setDeadlines((prevDeadlines) =>
        prevDeadlines.map((deadline) => {
          const dueDate = new Date(deadline.due_date)
          const diffMs = dueDate.getTime() - now.getTime()
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
          const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

          return {
            ...deadline,
            days_remaining: diffDays,
            hours_remaining: diffHours,
            minutes_remaining: diffMinutes,
            is_overdue: diffMs < 0,
          }
        }),
      )
    }, 60000) // Update every minute

    return () => clearInterval(intervalId)
  }, [user])

  // Filter deadlines
  const filteredDeadlines = deadlines.filter((deadline) => {
    // Filter by course if a specific course is selected
    if (selectedCourse !== "all" && deadline.course_id !== selectedCourse) {
      return false
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        deadline.title.toLowerCase().includes(searchLower) ||
        (deadline.description && deadline.description.toLowerCase().includes(searchLower)) ||
        deadline.course_code.toLowerCase().includes(searchLower) ||
        deadline.course_title.toLowerCase().includes(searchLower)
      )
    }

    // Filter by past/upcoming
    if (!showPast && deadline.is_overdue) {
      return false
    }

    return true
  })

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get countdown text
  const getCountdownText = (deadline: Deadline) => {
    if (deadline.is_overdue) {
      return "Overdue"
    }

    if (deadline.days_remaining > 0) {
      return `${deadline.days_remaining} day${deadline.days_remaining !== 1 ? "s" : ""}, ${
        deadline.hours_remaining
      } hr${deadline.hours_remaining !== 1 ? "s" : ""} remaining`
    }

    if (deadline.hours_remaining > 0) {
      return `${deadline.hours_remaining} hr${deadline.hours_remaining !== 1 ? "s" : ""}, ${
        deadline.minutes_remaining
      } min${deadline.minutes_remaining !== 1 ? "s" : ""} remaining`
    }

    return `${deadline.minutes_remaining} minute${deadline.minutes_remaining !== 1 ? "s" : ""} remaining`
  }

  // Get urgency class
  const getUrgencyClass = (deadline: Deadline) => {
    if (deadline.is_overdue) {
      return "bg-red-900 text-red-300"
    }

    if (deadline.days_remaining === 0 && deadline.hours_remaining < 24) {
      return "bg-yellow-900 text-yellow-300"
    }

    if (deadline.days_remaining <= 2) {
      return "bg-orange-900 text-orange-300"
    }

    return "bg-green-900 text-green-300"
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Deadlines</h1>
        <p className="mt-4 text-gray-400">Please log in to view deadlines.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Deadlines</h1>
          <p className="mt-1 text-gray-400">Track upcoming assignments and exams</p>
        </div>
        {user.role === "admin" || user.role === "faculty" ? (
          <Link href="/dashboard/deadlines/create" className="btn-primary">
            Add Deadline
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="w-full md:w-64">
            <label htmlFor="courseFilter" className="block text-sm font-medium text-gray-400 mb-1">
              Filter by Course
            </label>
            <select
              id="courseFilter"
              className="input-field"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              id="showPast"
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="showPast" className="ml-2 block text-sm text-gray-400">
              Show past deadlines
            </label>
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search deadlines..."
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
          <div className="space-y-4">
            {filteredDeadlines.length > 0 ? (
              filteredDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className={`bg-card p-4 rounded-lg border ${
                    deadline.is_overdue ? "border-red-800" : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="flex-grow">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-white">{deadline.title}</h3>
                        <span
                          className={`ml-3 px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyClass(deadline)}`}
                        >
                          {getCountdownText(deadline)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {deadline.course_code} - {deadline.course_title}
                      </p>
                      {deadline.description && <p className="text-gray-300 mt-1">{deadline.description}</p>}
                      <div className="mt-2 text-sm text-gray-400">
                        <span>Due: {formatDate(deadline.due_date)}</span>
                      </div>
                    </div>
                    {(user.role === "admin" || user.role === "faculty") && (
                      <div className="mt-4 md:mt-0 md:ml-4 flex-shrink-0">
                        <Link
                          href={`/dashboard/deadlines/edit/${deadline.id}`}
                          className="text-purple-500 hover:text-purple-400"
                        >
                          Edit
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
                <p className="text-gray-400">
                  {searchTerm || selectedCourse !== "all"
                    ? "No deadlines found matching your search criteria."
                    : showPast
                      ? "No deadlines have been set yet."
                      : "No upcoming deadlines."}
                </p>
                {(user.role === "admin" || user.role === "faculty") && (
                  <Link href="/dashboard/deadlines/create" className="btn-primary inline-block mt-4">
                    Add Deadline
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
