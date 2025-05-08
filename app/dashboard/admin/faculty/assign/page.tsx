"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Course = Database["public"]["Tables"]["courses"]["Row"]
type TeachingAssignment = Database["public"]["Tables"]["teaching_assignments"]["Row"]

export default function AssignFaculty() {
  const { user } = useAuth()
  const [faculty, setFaculty] = useState<UserProfile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Record<string, string[]>>({}) // facultyId -> courseIds
  const [selectedFaculty, setSelectedFaculty] = useState<string>("")
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)

        // Fetch all faculty
        const { data: facultyData, error: facultyError } = await supabase
          .from("users")
          .select("*")
          .eq("role", "faculty")
          .order("name")

        if (facultyError) throw facultyError

        if (facultyData) {
          setFaculty(facultyData)
          if (facultyData.length > 0) {
            setSelectedFaculty(facultyData[0].id)
          }
        }

        // Fetch all courses
        const { data: coursesData, error: coursesError } = await supabase.from("courses").select("*").order("code")

        if (coursesError) throw coursesError

        if (coursesData) {
          setCourses(coursesData)
          if (coursesData.length > 0) {
            setSelectedCourse(coursesData[0].id)
          }
        }

        // Fetch all teaching assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("teaching_assignments")
          .select("*")

        if (assignmentsError) throw assignmentsError

        if (assignmentsData) {
          // Organize assignments by faculty
          const assignmentMap: Record<string, string[]> = {}

          assignmentsData.forEach((assignment) => {
            if (!assignmentMap[assignment.user_id]) {
              assignmentMap[assignment.user_id] = []
            }
            assignmentMap[assignment.user_id].push(assignment.course_id)
          })

          setAssignments(assignmentMap)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleAssignFaculty = async () => {
    if (!selectedFaculty || !selectedCourse) return

    try {
      setActionLoading(true)
      setMessage({ text: "", type: "" })

      // Check if assignment already exists
      const facultyAssignments = assignments[selectedFaculty] || []
      if (facultyAssignments.includes(selectedCourse)) {
        setMessage({ text: "Faculty is already assigned to this course", type: "error" })
        return
      }

      // Create new assignment
      const { error } = await supabase.from("teaching_assignments").insert({
        user_id: selectedFaculty,
        course_id: selectedCourse,
      })

      if (error) throw error

      // Update local state
      setAssignments((prev) => {
        const updated = { ...prev }
        if (!updated[selectedFaculty]) {
          updated[selectedFaculty] = []
        }
        updated[selectedFaculty].push(selectedCourse)
        return updated
      })

      setMessage({ text: "Faculty assigned successfully", type: "success" })
    } catch (error: any) {
      console.error("Error assigning faculty:", error)
      setMessage({ text: error.message || "Failed to assign faculty", type: "error" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveAssignment = async (facultyId: string, courseId: string) => {
    try {
      setActionLoading(true)
      setMessage({ text: "", type: "" })

      // Delete assignment
      const { error } = await supabase
        .from("teaching_assignments")
        .delete()
        .eq("user_id", facultyId)
        .eq("course_id", courseId)

      if (error) throw error

      // Update local state
      setAssignments((prev) => {
        const updated = { ...prev }
        if (updated[facultyId]) {
          updated[facultyId] = updated[facultyId].filter((id) => id !== courseId)
        }
        return updated
      })

      setMessage({ text: "Assignment removed successfully", type: "success" })
    } catch (error: any) {
      console.error("Error removing assignment:", error)
      setMessage({ text: error.message || "Failed to remove assignment", type: "error" })
    } finally {
      setActionLoading(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Assign Faculty to Courses</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Assign Faculty to Courses</h1>
      <p className="mt-1 text-gray-400">Manage faculty teaching assignments</p>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Assignment Form */}
          <div className="bg-card p-6 rounded-lg border border-gray-800">
            <h2 className="text-lg font-medium text-white mb-4">Assign a Faculty</h2>

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
                <label htmlFor="faculty" className="block text-sm font-medium text-gray-400 mb-1">
                  Select Faculty
                </label>
                <select
                  id="faculty"
                  className="input-field"
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  disabled={faculty.length === 0}
                >
                  {faculty.length === 0 ? (
                    <option value="">No faculty available</option>
                  ) : (
                    faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.email})
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
                onClick={handleAssignFaculty}
                disabled={actionLoading || !selectedFaculty || !selectedCourse}
                className="btn-primary"
              >
                {actionLoading ? "Assigning..." : "Assign Faculty"}
              </button>
            </div>
          </div>

          {/* Current Assignments */}
          <div className="bg-card p-6 rounded-lg border border-gray-800">
            <h2 className="text-lg font-medium text-white mb-4">Current Assignments</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="viewFaculty" className="block text-sm font-medium text-gray-400 mb-1">
                  Select Faculty to View Assignments
                </label>
                <select
                  id="viewFaculty"
                  className="input-field"
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  disabled={faculty.length === 0}
                >
                  {faculty.length === 0 ? (
                    <option value="">No faculty available</option>
                  ) : (
                    faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.email})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedFaculty && (
                <div className="mt-4">
                  <h3 className="text-md font-medium text-white mb-2">
                    Courses for {faculty.find((f) => f.id === selectedFaculty)?.name}
                  </h3>

                  {assignments[selectedFaculty]?.length > 0 ? (
                    <ul className="space-y-2">
                      {assignments[selectedFaculty].map((courseId) => {
                        const course = courses.find((c) => c.id === courseId)
                        return course ? (
                          <li key={courseId} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                            <span>
                              {course.code} - {course.title}
                            </span>
                            <button
                              onClick={() => handleRemoveAssignment(selectedFaculty, courseId)}
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
                    <p className="text-gray-400">This faculty is not assigned to any courses.</p>
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
