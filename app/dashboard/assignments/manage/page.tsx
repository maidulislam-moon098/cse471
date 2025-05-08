"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { PlusCircle, Pencil, Eye, MoreHorizontal, Clock } from "lucide-react"
import Link from "next/link"

type Assignment = {
  id: string
  title: string
  description: string | null
  due_date: string
  max_points: number
  submission_count: number
  course: {
    id: string
    code: string
    title: string
  }
}

export default function ManageAssignments() {
  const { user } = useAuth()
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coursesTeaching, setCoursesTeaching] = useState<{ id: string; code: string; title: string }[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    // Redirect students to assignments page
    if (user?.role === "student") {
      router.push("/dashboard/assignments")
      return
    }

    const fetchAssignments = async () => {
      if (!user || user.role === "student") return

      try {
        setLoading(true)
        console.log("Fetching assignments for faculty:", user.id)

        // Get courses taught by this faculty
        const { data: teachingAssignments, error: teachingError } = await supabase
          .from("teaching_assignments")
          .select("course_id")
          .eq("user_id", user.id)

        if (teachingError) {
          console.error("Error fetching teaching assignments:", teachingError)
          throw teachingError
        }

        if (!teachingAssignments || teachingAssignments.length === 0) {
          console.log("No teaching assignments found")
          // Set mock data
          setMockData()
          return
        }

        const courseIds = teachingAssignments.map((ta) => ta.course_id)
        console.log("Courses taught:", courseIds)

        // Get courses info
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("id, code, title")
          .in("id", courseIds)

        if (coursesError) {
          console.error("Error fetching courses:", coursesError)
          throw coursesError
        }

        if (courses) {
          setCoursesTeaching(courses)
        }

        // Check if assignments table exists
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
              setMockData()
              setLoading(false)
              return
            }
          }

          // Get assignments for these courses
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from("assignments")
            .select(`
              id, title, description, due_date, max_points, course_id,
              courses:course_id (id, code, title)
            `)
            .in("course_id", courseIds)
            .order("due_date", { ascending: false })

          if (assignmentsError) {
            console.error("Error fetching assignments:", assignmentsError)
            setMockData()
            setLoading(false)
            return
          }

          console.log("Assignments data:", assignmentsData)

          // Get submission counts per assignment
          const assignmentIds = (assignmentsData || []).map((a) => a.id)
          const submissionCounts: Record<string, number> = {}

          if (assignmentIds.length > 0) {
            try {
              // First check if the assignment_submissions table exists
              const { error: tableCheckError } = await supabase
                .from("assignment_submissions")
                .select("id")
                .limit(1)
                .maybeSingle()

              if (!tableCheckError) {
                const { data: counts, error: countsError } = await supabase
                  .from("assignment_submissions")
                  .select("assignment_id, count")
                  .in("assignment_id", assignmentIds)
                  .group("assignment_id")

                if (!countsError && counts) {
                  counts.forEach((item) => {
                    submissionCounts[item.assignment_id] = item.count
                  })
                }
              } else {
                console.warn("assignment_submissions table may not exist:", tableCheckError)
              }
            } catch (countError) {
              console.error("Error getting submission counts:", countError)
              // Continue without counts
            }
          }

          // Format assignments with submission counts
          const formattedAssignments = (assignmentsData || []).map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            due_date: assignment.due_date,
            max_points: assignment.max_points,
            submission_count: submissionCounts[assignment.id] || 0,
            course: assignment.courses || {
              id: assignment.course_id,
              code: "Unknown",
              title: "Unknown Course",
            },
          }))

          console.log("Formatted assignments:", formattedAssignments)

          if (formattedAssignments.length > 0) {
            setAssignments(formattedAssignments)
            setLoading(false)
          } else {
            console.log("No assignments found, using mock data")
            setMockData()
            setLoading(false)
          }
        } catch (error) {
          console.error("Error in fetchAssignments:", error)
          setError("Failed to load assignments. Please try again later.")
          setMockData()
        } finally {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error in fetchAssignments:", error)
        setError("Failed to load assignments. Please try again later.")
        setMockData()
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [user, router])

  const setMockData = () => {
    console.log("Setting mock assignments data for faculty")

    // Mock courses
    const mockCourses = [
      { id: "course-1", code: "CSE471", title: "System Analysis and Design" },
      { id: "course-2", code: "CSE311", title: "Database Systems" },
    ]

    setCoursesTeaching(mockCourses)

    // Mock assignments
    const mockAssignments: Assignment[] = [
      {
        id: "mock-1",
        title: "Database Normalization",
        description: "Complete the database normalization assignment",
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        max_points: 100,
        submission_count: 12,
        course: mockCourses[1],
      },
      {
        id: "mock-2",
        title: "System Design Project",
        description: "Design a system based on the requirements document",
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
        max_points: 150,
        submission_count: 8,
        course: mockCourses[0],
      },
      {
        id: "mock-3",
        title: "SQL Query Optimization",
        description: "Optimize the provided SQL queries for better performance",
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        max_points: 50,
        submission_count: 15,
        course: mockCourses[1],
      },
      {
        id: "mock-4",
        title: "UML Diagrams",
        description: "Create UML class and sequence diagrams for the given scenario",
        due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        max_points: 75,
        submission_count: 20,
        course: mockCourses[0],
      },
    ]

    setAssignments(mockAssignments)
  }

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

  const getDueStatusStyle = (dueDate: string) => {
    const now = new Date()
    const due = new Date(dueDate)

    // Past due
    if (due < now) {
      return "text-red-400"
    }

    // Due within 48 hours
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntilDue <= 48) {
      return "text-yellow-400"
    }

    // Due later
    return "text-green-400"
  }

  // If user is student, show loading while redirecting
  if (user?.role === "student") {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const filteredAssignments =
    selectedCourse === "all" ? assignments : assignments.filter((a) => a.course.id === selectedCourse)

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Manage Assignments</h1>
          <p className="mt-1 text-gray-400">Create and manage assignments for your courses</p>
        </div>
        <Link href="/dashboard/assignments/create" className="btn-primary mt-4 md:mt-0 flex items-center">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Assignment
        </Link>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900 text-red-300 rounded">
          <p>{error}</p>
        </div>
      )}

      <div className="mt-6 flex items-center">
        <label htmlFor="course-filter" className="mr-2 text-sm text-gray-400">
          Filter by Course:
        </label>
        <select
          id="course-filter"
          className="bg-gray-800 text-white rounded-md border border-gray-700 py-1 px-3"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          <option value="all">All Courses</option>
          {coursesTeaching.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-gray-400">
            {selectedCourse === "all"
              ? "No assignments found. Create your first assignment!"
              : "No assignments found for this course. Create an assignment!"}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full bg-gray-900 rounded-lg overflow-hidden">
            <thead className="bg-gray-800">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Assignment
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Course
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Max Points
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Submissions
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-800">
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{assignment.title}</div>
                    {assignment.description && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-1">{assignment.description}</div>
                    )}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{assignment.course.code}</div>
                    <div className="text-xs text-gray-400">{assignment.course.title}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className={`text-sm flex items-center ${getDueStatusStyle(assignment.due_date)}`}>
                      <Clock className="mr-1 h-4 w-4" />
                      {formatDate(assignment.due_date)}
                    </div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{assignment.max_points}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{assignment.submission_count}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-2">
                      {!assignment.id.startsWith("mock-") ? (
                        <>
                          <button
                            onClick={() => router.push(`/dashboard/assignments/view/${assignment.id}`)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                            title="View Assignment"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/assignments/edit/${assignment.id}`)}
                            className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
                            title="Edit Assignment"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/assignments/submissions/${assignment.id}`)}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            title="View Submissions"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        // For mock data, show disabled buttons with a tooltip
                        <>
                          <button
                            onClick={() => alert("This is a mock assignment for demonstration purposes.")}
                            className="p-1 text-gray-400 cursor-not-allowed"
                            title="Mock Assignment - View Only"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => alert("This is a mock assignment for demonstration purposes.")}
                            className="p-1 text-gray-400 cursor-not-allowed"
                            title="Mock Assignment - Cannot Edit"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => alert("This is a mock assignment for demonstration purposes.")}
                            className="p-1 text-gray-400 cursor-not-allowed"
                            title="Mock Assignment - No Submissions"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
