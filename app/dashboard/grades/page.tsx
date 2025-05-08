"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect, useRef } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

type GradeData = {
  assignment: {
    id: string
    title: string
    max_points: number
    due_date: string
  }
  course: {
    id: string
    code: string
    title: string
  }
  submission: {
    id: string
    status: string
    grade: number | null
    feedback: string | null
    submitted_at: string
    graded_at: string | null
  }
}

export default function GradeReports() {
  const { user } = useAuth()
  const router = useRouter()
  const [grades, setGrades] = useState<GradeData[]>([])
  const [loading, setLoading] = useState(true)
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [courses, setCourses] = useState<{ id: string; code: string; title: string }[]>([])
  const [stats, setStats] = useState({
    totalAssignments: 0,
    completedAssignments: 0,
    averageGrade: 0,
    totalPoints: 0,
    earnedPoints: 0,
  })
  const chartRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchGrades = async () => {
      if (!user || user.role !== "student") {
        router.push("/dashboard")
        return
      }

      try {
        setLoading(true)

        // Get enrolled courses
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id)

        if (enrollmentsError) throw enrollmentsError

        if (!enrollments || enrollments.length === 0) {
          setGrades([])
          return
        }

        const courseIds = enrollments.map((e) => e.course_id)

        // Get courses info
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, code, title")
          .in("id", courseIds)
          .order("code")

        if (coursesError) throw coursesError
        setCourses(coursesData || [])

        // Get graded assignments
        const { data, error } = await supabase
          .from("assignment_submissions")
          .select(`
            id, status, grade, feedback, submitted_at, graded_at,
            assignments:assignment_id (id, title, max_points, due_date, course_id),
            courses:assignments!inner(course_id).courses (id, code, title)
          `)
          .eq("user_id", user.id)
          .eq("status", "graded")
          .order("graded_at", { ascending: false })

        if (error) throw error

        // Format the data
        const formattedGrades = (data || []).map((item) => ({
          assignment: {
            id: item.assignments.id,
            title: item.assignments.title,
            max_points: item.assignments.max_points,
            due_date: item.assignments.due_date,
          },
          course: {
            id: item.courses.id,
            code: item.courses.code,
            title: item.courses.title,
          },
          submission: {
            id: item.id,
            status: item.status,
            grade: item.grade,
            feedback: item.feedback,
            submitted_at: item.submitted_at,
            graded_at: item.graded_at,
          },
        }))

        setGrades(formattedGrades)

        // Calculate statistics
        if (formattedGrades.length > 0) {
          const totalAssignments = formattedGrades.length
          const completedAssignments = formattedGrades.filter((g) => g.submission.grade !== null).length
          const totalPoints = formattedGrades.reduce((sum, g) => sum + g.assignment.max_points, 0)
          const earnedPoints = formattedGrades.reduce((sum, g) => sum + (g.submission.grade || 0), 0)
          const averageGrade = (earnedPoints / totalPoints) * 100

          setStats({
            totalAssignments,
            completedAssignments,
            averageGrade,
            totalPoints,
            earnedPoints,
          })
        }
      } catch (error) {
        console.error("Error fetching grades:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGrades()
  }, [user, router])

  // Filter grades by course
  const filteredGrades = grades.filter((grade) => {
    if (courseFilter === "all") return true
    return grade.course.id === courseFilter
  })

  // Prepare chart data
  const chartData = {
    labels: filteredGrades.map((g) => g.assignment.title),
    datasets: [
      {
        label: "Your Score",
        data: filteredGrades.map((g) => g.submission.grade || 0),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
      {
        label: "Maximum Points",
        data: filteredGrades.map((g) => g.assignment.max_points),
        backgroundColor: "rgba(153, 102, 255, 0.6)",
        borderColor: "rgba(153, 102, 255, 1)",
        borderWidth: 1,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "white",
        },
      },
      title: {
        display: true,
        text: "Assignment Grades",
        color: "white",
      },
    },
    scales: {
      x: {
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      y: {
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        beginAtZero: true,
      },
    },
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getGradePercentage = (grade: number | null, maxPoints: number) => {
    if (grade === null) return "N/A"
    const percentage = (grade / maxPoints) * 100
    return `${percentage.toFixed(1)}%`
  }

  const getGradeColor = (grade: number | null, maxPoints: number) => {
    if (grade === null) return "text-gray-400"
    const percentage = (grade / maxPoints) * 100
    if (percentage >= 90) return "text-green-400"
    if (percentage >= 80) return "text-blue-400"
    if (percentage >= 70) return "text-yellow-400"
    if (percentage >= 60) return "text-orange-400"
    return "text-red-400"
  }

  const downloadReport = () => {
    if (filteredGrades.length === 0) return

    let csvContent = "Course,Assignment,Due Date,Max Points,Your Grade,Percentage,Graded Date\n"

    filteredGrades.forEach((grade) => {
      const row = [
        `"${grade.course.code} - ${grade.course.title}"`,
        `"${grade.assignment.title}"`,
        formatDate(grade.assignment.due_date),
        grade.assignment.max_points,
        grade.submission.grade || "N/A",
        grade.submission.grade ? getGradePercentage(grade.submission.grade, grade.assignment.max_points) : "N/A",
        formatDate(grade.submission.graded_at || ""),
      ]
      csvContent += row.join(",") + "\n"
    })

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "grade_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (user?.role !== "student") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Grade Reports</h1>
        <p className="mt-4 text-gray-400">This page is only available for students.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Grade Reports</h1>
      <p className="mt-1 text-gray-400">View your grades and academic progress</p>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : grades.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-gray-400">No graded assignments found.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Overall Grade</h3>
              <p className="text-2xl font-bold text-white mt-1">{stats.averageGrade.toFixed(1)}%</p>
            </div>
            <div className="bg-card p-4 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Total Points</h3>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.earnedPoints} / {stats.totalPoints}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Assignments Completed</h3>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.completedAssignments} / {stats.totalAssignments}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Completion Rate</h3>
              <p className="text-2xl font-bold text-white mt-1">
                {((stats.completedAssignments / stats.totalAssignments) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <label htmlFor="course-filter" className="block text-sm font-medium text-gray-400 mb-1">
                Filter by Course
              </label>
              <select
                id="course-filter"
                className="input-field w-full md:w-64"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-primary" onClick={downloadReport}>
              Download Report
            </button>
          </div>

          <div className="mt-6 bg-card p-4 rounded-lg border border-gray-800">
            <div ref={chartRef} className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="mt-6 bg-card rounded-lg border border-gray-800">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrades.map((grade) => (
                    <tr key={grade.submission.id} className="border-b border-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{grade.course.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{grade.assignment.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(grade.assignment.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={getGradeColor(grade.submission.grade, grade.assignment.max_points)}>
                          {grade.submission.grade} / {grade.assignment.max_points}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={getGradeColor(grade.submission.grade, grade.assignment.max_points)}>
                          {getGradePercentage(grade.submission.grade, grade.assignment.max_points)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <button
                          className="text-purple-500 hover:text-purple-400"
                          onClick={() => router.push(`/dashboard/assignments/view/${grade.assignment.id}`)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
