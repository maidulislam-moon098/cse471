"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

type Assignment = {
  id: string
  title: string
  description: string | null
  due_date: string
  max_points: number
  course: {
    id: string
    code: string
    title: string
  }
  submission?: {
    id: string
    status: string
    grade: number | null
    submitted_at: string
  } | null
}

export default function Assignments() {
  const { user } = useAuth()
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all") // all, pending, submitted, graded
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()

  // Function to set mock assignments data
  const setMockAssignments = () => {
    console.log("Setting mock assignments data")
    const mockData: Assignment[] = [
      {
        id: "mock-1",
        title: "Midterm Project",
        description: "Complete the midterm project according to the specifications",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        max_points: 100,
        course: {
          id: "course-1",
          code: "CSE471",
          title: "System Analysis and Design",
        },
        submission: null,
      },
      {
        id: "mock-2",
        title: "Algorithm Assignment 3",
        description: "Implement the sorting algorithms discussed in class",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        max_points: 50,
        course: {
          id: "course-2",
          code: "CSE331",
          title: "Data Structures",
        },
        submission: null,
      },
      {
        id: "mock-3",
        title: "Web Application Project",
        description: "Build a responsive web application using React",
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        max_points: 120,
        course: {
          id: "course-3",
          code: "CSE482",
          title: "Internet and Web Technology",
        },
        submission: {
          id: "sub-1",
          status: "submitted",
          grade: null,
          submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        },
      },
      {
        id: "mock-4",
        title: "Database Design",
        description: "Design a normalized database schema for the case study",
        due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (overdue)
        max_points: 80,
        course: {
          id: "course-2",
          code: "CSE311",
          title: "Database Systems",
        },
        submission: {
          id: "sub-2",
          status: "graded",
          grade: 75,
          submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        },
      },
    ]
    setAssignments(mockData)
  }

  useEffect(() => {
    // Redirect faculty to manage assignments page
    if (user?.role === "faculty") {
      router.push("/dashboard/assignments/manage")
      return
    }

    const fetchAssignments = async () => {
      if (!user || user.role === "faculty") return

      try {
        setLoading(true)
        console.log("Fetching assignments for student:", user.id)

        // For students, get enrolled courses first
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id)

        if (enrollmentsError) {
          console.error("Error fetching enrollments:", enrollmentsError)
          throw enrollmentsError
        }

        console.log("Student enrollments:", enrollments)

        if (!enrollments || enrollments.length === 0) {
          console.log("No enrollments found for student")
          // Set mock data if no real enrollments found (for demo purposes)
          setMockAssignments()
          setLoading(false)
          return
        }

        const courseIds = enrollments.map((e) => e.course_id)
        console.log("Course IDs for student:", courseIds)

        // First, let's check if the assignments table exists
        try {
          const { data: tableExists, error: tableError } = await supabase
            .from("assignments")
            .select("id")
            .limit(1)
            .maybeSingle()

          if (tableError) {
            console.warn("Error checking assignments table:", tableError)
            if (tableError.code === "42P01") {
              console.warn("Assignments table does not exist. Creating mock data instead.")
              setMockAssignments()
              setLoading(false)
              return
            }
          }

          // Get all assignments for these courses
          const { data: allAssignments, error: assignmentsError } = await supabase
            .from("assignments")
            .select(`
              id, title, description, due_date, points_possible as max_points,
              course_id,
              courses:course_id (id, code, title)
            `)
            .in("course_id", courseIds)
            .order("due_date", { ascending: false })

          if (assignmentsError) {
            console.error("Error fetching assignments:", assignmentsError)
            setMockAssignments()
            setLoading(false)
            return
          }

          console.log("All course assignments:", allAssignments)

          // Get all submissions for this student
          try {
            const { data: submissions, error: submissionsError } = await supabase
              .from("assignment_submissions")
              .select("id, assignment_id, status, grade, submitted_at")
              .eq("user_id", user.id)

            if (submissionsError) {
              console.error("Error fetching submissions:", submissionsError)
              // Continue even if submissions fetch fails
            }

            console.log("Student submissions:", submissions)

            // Combine assignments with submissions
            const formattedAssignments = (allAssignments || []).map((assignment) => {
              const submission = submissions?.find((s) => s.assignment_id === assignment.id) || null
              return {
                id: assignment.id,
                title: assignment.title,
                description: assignment.description,
                due_date: assignment.due_date,
                max_points: assignment.max_points || 0, // Add default value
                course: assignment.courses || {
                  id: assignment.course_id,
                  code: "Unknown",
                  title: "Unknown Course",
                },
                submission: submission
                  ? {
                      id: submission.id,
                      status: submission.status || "pending",
                      grade: submission.grade !== undefined ? submission.grade : null,
                      submitted_at: submission.submitted_at,
                    }
                  : null,
              }
            })

            console.log("Combined assignments:", formattedAssignments)

            if (formattedAssignments.length > 0) {
              setAssignments(formattedAssignments)
              setLoading(false)
            } else {
              // If no assignments found, use mock data
              console.log("No assignments found, using mock data")
              setMockAssignments()
              setLoading(false)
            }
          } catch (submissionError) {
            console.error("Error fetching submissions:", submissionError)
            // Continue without submissions data
            setMockAssignments()
            setLoading(false)
          }
        } catch (error) {
          console.error("Error fetching assignments:", error)
          setError("Failed to load assignments. Please try again later.")
          // Set mock data on error
          setMockAssignments()
          setLoading(false)
        }
      } catch (error) {
        console.error("Error in fetchAssignments:", error)
        setError("Failed to load assignments. Please try again later.")
        setMockAssignments()
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [user, router])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (assignment: Assignment) => {
    if (!assignment.submission) {
      const dueDate = new Date(assignment.due_date)
      const now = new Date()

      if (dueDate < now) {
        return <span className="bg-red-900 text-red-300 px-2 py-1 rounded text-xs">Overdue</span>
      }
      return <span className="bg-yellow-900 text-yellow-300 px-2 py-1 rounded text-xs">Pending</span>
    }

    switch (assignment.submission.status) {
      case "submitted":
        return <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs">Submitted</span>
      case "graded":
        return <span className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs">Graded</span>
      default:
        return (
          <span className="bg-gray-900 text-gray-300 px-2 py-1 rounded text-xs">
            {assignment.submission.status || "Unknown"}
          </span>
        )
    }
  }

  // If user is faculty, show loading while redirecting
  if (user?.role === "faculty") {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === "all") return true
    if (filter === "pending" && !assignment.submission) return true
    if (filter === "submitted" && assignment.submission?.status === "submitted") return true
    if (filter === "graded" && assignment.submission?.status === "graded") return true
    return false
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Assignments</h1>
      <p className="mt-1 text-gray-400">View and submit your course assignments</p>

      {error && (
        <div className="mt-4 p-3 bg-red-900 text-red-300 rounded">
          <p>{error}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded text-sm ${
              filter === "all" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300"
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${
              filter === "pending" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300"
            }`}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${
              filter === "submitted" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300"
            }`}
            onClick={() => setFilter("submitted")}
          >
            Submitted
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${
              filter === "graded" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300"
            }`}
            onClick={() => setFilter("graded")}
          >
            Graded
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-gray-400">No assignments found.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4">
          {filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-card p-4 rounded-lg border border-gray-800 hover:border-purple-600 transition-colors cursor-pointer"
              onClick={() => {
                // Only navigate to actual assignment pages, not for mock data
                if (!assignment.id.startsWith("mock-")) {
                  router.push(`/dashboard/assignments/view/${assignment.id}`)
                } else {
                  alert("This is a mock assignment for demonstration purposes.")
                }
              }}
            >
              <div className="flex flex-col md:flex-row justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">{assignment.title}</h3>
                  <p className="text-sm text-gray-400">
                    {assignment.course.code} - {assignment.course.title}
                  </p>
                  {assignment.description && (
                    <p className="text-sm text-gray-300 mt-2 line-clamp-2">{assignment.description}</p>
                  )}
                </div>
                <div className="mt-2 md:mt-0 flex flex-col items-start md:items-end">
                  {getStatusBadge(assignment)}
                  <p className="text-sm text-gray-400 mt-1">Due: {formatDate(assignment.due_date)}</p>
                  {assignment.submission?.grade !== null && assignment.submission?.grade !== undefined && (
                    <p className="text-sm font-medium text-white mt-1">
                      Grade: {assignment.submission.grade}/{assignment.max_points || 0}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
