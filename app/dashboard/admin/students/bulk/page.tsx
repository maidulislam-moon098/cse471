"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]
type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function BulkStudentOperations() {
  const { user } = useAuth()
  const [students, setStudents] = useState<UserProfile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [operation, setOperation] = useState<"enroll" | "remove">("enroll")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)

        // Fetch all students
        const { data: studentsData, error: studentsError } = await supabase
          .from("users")
          .select("*")
          .eq("role", "student")
          .order("name")

        if (studentsError) throw studentsError

        // Fetch all courses
        const { data: coursesData, error: coursesError } = await supabase.from("courses").select("*").order("code")

        if (coursesError) throw coursesError

        setStudents(studentsData || [])
        setCourses(coursesData || [])
        if (coursesData && coursesData.length > 0) {
          setSelectedCourse(coursesData[0].id)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map((student) => student.id))
    }
  }

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse || selectedStudents.length === 0) return

    try {
      setProcessing(true)
      setMessage({ text: "", type: "" })

      if (operation === "enroll") {
        // Get existing enrollments to avoid duplicates
        const { data: existingEnrollments, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select("user_id")
          .eq("course_id", selectedCourse)
          .in("user_id", selectedStudents)

        if (enrollmentsError) throw enrollmentsError

        // Filter out students who are already enrolled
        const existingStudentIds = existingEnrollments?.map((e) => e.user_id) || []
        const studentsToEnroll = selectedStudents.filter((id) => !existingStudentIds.includes(id))

        if (studentsToEnroll.length === 0) {
          setMessage({ text: "All selected students are already enrolled in this course", type: "info" })
          return
        }

        // Create enrollment records
        const enrollmentRecords = studentsToEnroll.map((studentId) => ({
          user_id: studentId,
          course_id: selectedCourse,
        }))

        const { error: insertError } = await supabase.from("enrollments").insert(enrollmentRecords)

        if (insertError) throw insertError

        setMessage({
          text: `Successfully enrolled ${studentsToEnroll.length} students in the course`,
          type: "success",
        })
      } else {
        // Remove enrollments
        const { error: deleteError } = await supabase
          .from("enrollments")
          .delete()
          .eq("course_id", selectedCourse)
          .in("user_id", selectedStudents)

        if (deleteError) throw deleteError

        setMessage({
          text: `Successfully removed ${selectedStudents.length} students from the course`,
          type: "success",
        })
      }

      // Reset selection
      setSelectedStudents([])
    } catch (error: any) {
      console.error("Error processing bulk operation:", error)
      setMessage({ text: error.message || "Failed to process operation", type: "error" })
    } finally {
      setProcessing(false)
    }
  }

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.department && student.department.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-white">Bulk Student Operations</h1>
        <p className="mt-4 text-gray-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Bulk Student Operations</h1>
      <p className="mt-1 text-gray-400">Manage multiple students at once</p>

      {message.text && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === "success"
              ? "bg-green-900 text-green-300"
              : message.type === "info"
                ? "bg-blue-900 text-blue-300"
                : "bg-red-900 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Operation Form */}
          <div className="lg:col-span-1 bg-card p-6 rounded-lg border border-gray-800">
            <h2 className="text-lg font-medium text-white mb-4">Operation Settings</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="operation" className="block text-sm font-medium text-gray-400 mb-1">
                  Select Operation
                </label>
                <select
                  id="operation"
                  className="input-field"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value as "enroll" | "remove")}
                >
                  <option value="enroll">Enroll Students in Course</option>
                  <option value="remove">Remove Students from Course</option>
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
                  required
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

              <div className="pt-4">
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={processing || selectedStudents.length === 0 || !selectedCourse}
                >
                  {processing
                    ? "Processing..."
                    : `${operation === "enroll" ? "Enroll" : "Remove"} Selected Students (${selectedStudents.length})`}
                </button>
              </div>
            </form>
          </div>

          {/* Student Selection */}
          <div className="lg:col-span-2 bg-card p-6 rounded-lg border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-white">Select Students</h2>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  {selectedStudents.length === filteredStudents.length ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>

            <div className="relative w-full mb-4">
              <input
                type="text"
                placeholder="Search students..."
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

            <div className="overflow-y-auto max-h-96 pr-2">
              {filteredStudents.length > 0 ? (
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center p-3 rounded-md cursor-pointer ${
                        selectedStudents.includes(student.id) ? "bg-purple-900/30" : "bg-gray-800 hover:bg-gray-700"
                      }`}
                      onClick={() => handleSelectStudent(student.id)}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-600"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => {}} // Handled by the div click
                      />
                      <div className="ml-3 flex items-center">
                        <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                          <span className="text-white font-medium">{student.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-white">{student.name}</p>
                          <p className="text-xs text-gray-400">{student.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-4">
                  {searchTerm ? "No students found matching your search criteria." : "No students available."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
