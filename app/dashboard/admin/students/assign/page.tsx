"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Course = Database["public"]["Tables"]["courses"]["Row"]
type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"]

export default function AssignStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState<UserProfile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, string[]>>({}) // studentId -> courseIds
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [debug, setDebug] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)
        setDebug("Fetching data...")

        // Fetch all students
        const { data: studentsData, error: studentsError } = await supabase
          .from("users")
          .select("*")
          .eq("role", "student")
          .order("name")

        if (studentsError) {
          setDebug(`Error fetching students: ${JSON.stringify(studentsError)}`)
          throw studentsError
        }

        setDebug(`Fetched ${studentsData?.length || 0} students`)

        if (studentsData) {
          setStudents(studentsData)
          if (studentsData.length > 0) {
            setSelectedStudent(studentsData[0].id)
          }
        }

        // Fetch all courses
        const { data: coursesData, error: coursesError } = await supabase.from("courses").select("*").order("code")

        if (coursesError) {
          setDebug(`Error fetching courses: ${JSON.stringify(coursesError)}`)
          throw coursesError
        }

        setDebug(`Fetched ${coursesData?.length || 0} courses`)

        if (coursesData) {
          setCourses(coursesData)
          if (coursesData.length > 0) {
            setSelectedCourse(coursesData[0].id)
          }
        }

        // Fetch all enrollments
        const { data: enrollmentsData, error: enrollmentsError } = await supabase.from("enrollments").select("*")

        if (enrollmentsError) {
          setDebug(`Error fetching enrollments: ${JSON.stringify(enrollmentsError)}`)
          throw enrollmentsError
        }

        setDebug(`Fetched ${enrollmentsData?.length || 0} enrollments`)

        if (enrollmentsData) {
          // Organize enrollments by student
          const enrollmentMap: Record<string, string[]> = {}

          enrollmentsData.forEach((enrollment) => {
            if (!enrollmentMap[enrollment.user_id]) {
              enrollmentMap[enrollment.user_id] = []
            }
            enrollmentMap[enrollment.user_id].push(enrollment.course_id)
          })

          setEnrollments(enrollmentMap)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setDebug(`Error in fetchData: ${JSON.stringify(error)}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleEnrollStudent = async () => {
    if (!selectedStudent || !selectedCourse) return

    try {
      setActionLoading(true)
      setMessage({ text: "", type: "" })
      setDebug(`Enrolling student ${selectedStudent} in course ${selectedCourse}`)

      // Check if enrollment already exists
      const studentEnrollments = enrollments[selectedStudent] || []
      if (studentEnrollments.includes(selectedCourse)) {
        setMessage({ text: "Student is already enrolled in this course", type: "error" })
        return
      }

      // Create new enrollment
      const { data, error } = await supabase
        .from("enrollments")
        .insert({
          user_id: selectedStudent,
          course_id: selectedCourse,
          created_at: new Date().toISOString(),
        })
        .select()

      if (error) {
        setDebug(`Enrollment error: ${JSON.stringify(error)}`)
        throw new Error(error.message)
      }

      setDebug(`Enrollment successful: ${JSON.stringify(data)}`)

      // Update local state
      setEnrollments((prev) => {
        const updated = { ...prev }
        if (!updated[selectedStudent]) {
          updated[selectedStudent] = []
        }
        updated[selectedStudent] = [...updated[selectedStudent], selectedCourse]
        return updated
      })

      setMessage({ text: "Student enrolled successfully", type: "success" })
    } catch (error: any) {
      console.error("Error enrolling student:", error)
      setMessage({ text: error.message || "Failed to enroll student", type: "error" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveEnrollment = async (studentId: string, courseId: string) => {
    try {
      setActionLoading(true)
      setMessage({ text: "", type: "" })
      setDebug(`Removing enrollment for student ${studentId} from course ${courseId}`)

      // Delete enrollment
      const { error } = await supabase.from("enrollments").delete().eq("user_id", studentId).eq("course_id", courseId)

      if (error) {
        setDebug(`Remove enrollment error: ${JSON.stringify(error)}`)
        throw new Error(error.message)
      }

      setDebug("Enrollment removed successfully")

      // Update local state
      setEnrollments((prev) => {
        const updated = { ...prev }
        if (updated[studentId]) {
          updated[studentId] = updated[studentId].filter((id) => id !== courseId)
        }
        return updated
      })

      setMessage({ text: "Enrollment removed successfully", type: "success" })
    } catch (error: any) {
      console.error("Error removing enrollment:", error)
      setMessage({ text: error.message || "Failed to remove enrollment", type: "error" })
    } finally {
      setActionLoading(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Assign Students to Courses</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Assign Students to Courses</h1>
      <p className="mt-1 text-gray-400">Manage student enrollments in courses</p>

      {debug && (
        <div className="mt-4 p-3 bg-gray-800 rounded text-xs font-mono text-gray-300 max-h-32 overflow-auto">
          <p>Debug Info:</p>
          <pre>{debug}</pre>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Enrollment Form */}
          <div className="bg-card p-6 rounded-lg border border-gray-800">
            <h2 className="text-lg font-medium text-white mb-4">Enroll a Student</h2>

            {message.text && (
              <div
                className={`mb-4 p-3 rounded ${
                  message.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="student" className="block text-sm font-medium text-gray-400 mb-1">
                  Select Student
                </label>
                <select
                  id="student"
                  className="input-field"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  disabled={students.length === 0}
                >
                  {students.length === 0 ? (
                    <option value="">No students available</option>
                  ) : (
                    students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="course" className="block text-sm font-medium text-gray-400 mb-1">
                  Select Course
                </label>
                <select
                  id="course"
                  className="input-field"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  disabled={courses.length === 0}
                >
                  {courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <button
                onClick={handleEnrollStudent}
                disabled={
                  actionLoading || !selectedStudent || !selectedCourse || students.length === 0 || courses.length === 0
                }
                className="btn-primary w-full"
              >
                {actionLoading ? "Enrolling..." : "Enroll Student"}
              </button>
            </div>
          </div>

          {/* Current Enrollments */}
          <div className="bg-card p-6 rounded-lg border border-gray-800">
            <h2 className="text-lg font-medium text-white mb-4">Current Enrollments</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="viewStudent" className="block text-sm font-medium text-gray-400 mb-1">
                  Select Student to View Enrollments
                </label>
                <select
                  id="viewStudent"
                  className="input-field"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  disabled={students.length === 0}
                >
                  {students.length === 0 ? (
                    <option value="">No students available</option>
                  ) : (
                    students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedStudent && (
                <div className="mt-4">
                  <h3 className="text-md font-medium text-white mb-2">
                    Courses for {students.find((s) => s.id === selectedStudent)?.name}
                  </h3>

                  {enrollments[selectedStudent]?.length > 0 ? (
                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                      {enrollments[selectedStudent].map((courseId) => {
                        const course = courses.find((c) => c.id === courseId)
                        return course ? (
                          <li key={courseId} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                            <span>
                              {course.code} - {course.title}
                            </span>
                            <button
                              onClick={() => handleRemoveEnrollment(selectedStudent, courseId)}
                              disabled={actionLoading}
                              className="text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </li>
                        ) : null
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-400">This student is not enrolled in any courses.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
