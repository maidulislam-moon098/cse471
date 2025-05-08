"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function Courses() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({})
  const [instructors, setInstructors] = useState<Record<string, string>>({})
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch courses based on user role
        if (user.role === "student") {
          // Fetch enrolled courses for students
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("user_id", user.id)

          if (enrollmentsError) throw enrollmentsError

          if (enrollments && enrollments.length > 0) {
            const courseIds = enrollments.map((e) => e.course_id)

            const { data: coursesData, error: coursesError } = await supabase
              .from("courses")
              .select("*")
              .in("id", courseIds)

            if (coursesError) throw coursesError
            if (coursesData) setCourses(coursesData)

            // Fetch instructors for these courses
            for (const courseId of courseIds) {
              const { data: teachingData, error: teachingError } = await supabase
                .from("teaching_assignments")
                .select("user_id")
                .eq("course_id", courseId)
                .single()

              if (teachingError && teachingError.code !== "PGRST116") continue // PGRST116 is "no rows returned"

              if (teachingData) {
                const { data: instructorData, error: instructorError } = await supabase
                  .from("users")
                  .select("name")
                  .eq("id", teachingData.user_id)
                  .single()

                if (instructorError) continue

                if (instructorData) {
                  setInstructors((prev) => ({
                    ...prev,
                    [courseId]: instructorData.name,
                  }))
                }
              }
            }
          }
        } else {
          // Fetch teaching assignments for faculty
          const { data: assignments, error: assignmentsError } = await supabase
            .from("teaching_assignments")
            .select("course_id")
            .eq("user_id", user.id)

          if (assignmentsError) throw assignmentsError

          if (assignments && assignments.length > 0) {
            const courseIds = assignments.map((a) => a.course_id)

            const { data: coursesData, error: coursesError } = await supabase
              .from("courses")
              .select("*")
              .in("id", courseIds)

            if (coursesError) throw coursesError
            if (coursesData) setCourses(coursesData)

            // Fetch student counts for these courses
            for (const courseId of courseIds) {
              const { data: enrollmentData, error: enrollmentError } = await supabase
                .from("enrollments")
                .select("id", { count: "exact" })
                .eq("course_id", courseId)

              if (enrollmentError) continue

              setStudentCounts((prev) => ({
                ...prev,
                [courseId]: enrollmentData?.length || 0,
              }))
            }
          }
        }
      } catch (error) {
        console.error("Error fetching courses data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // If no data is available yet, show mock data
  useEffect(() => {
    if (!loading && courses.length === 0) {
      // Set mock data if no real data is available
      if (user?.role === "student") {
        setCourses([
          {
            id: "1",
            code: "CSE471",
            title: "System Analysis and Design",
            description:
              "This course introduces students to the concepts and skills of system analysis and design. It includes expanded coverage of data flow diagrams, data dictionary, and process specifications.",
            credits: 3,
            room: "Room 301",
            schedule: "Mon, Wed 10:00 AM - 11:30 AM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            code: "CSE331",
            title: "Data Structures",
            description:
              "This course covers the fundamental data structures and algorithms used in computer science. Topics include arrays, linked lists, stacks, queues, trees, graphs, sorting, and searching.",
            credits: 3,
            room: "Room 205",
            schedule: "Tue, Thu 1:00 PM - 2:30 PM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "3",
            code: "CSE482",
            title: "Internet and Web Technology",
            description:
              "This course provides an introduction to Internet and web technologies. Topics include HTML, CSS, JavaScript, server-side programming, and web application development.",
            credits: 3,
            room: "Lab 102",
            schedule: "Wed, Fri 3:00 PM - 4:30 PM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

        setInstructors({
          "1": "Dr. Jane Smith",
          "2": "Dr. John Doe",
          "3": "Dr. Robert Johnson",
        })
      } else {
        setCourses([
          {
            id: "1",
            code: "CSE471",
            title: "System Analysis and Design",
            description:
              "This course introduces students to the concepts and skills of system analysis and design. It includes expanded coverage of data flow diagrams, data dictionary, and process specifications.",
            credits: 3,
            room: "Room 301",
            schedule: "Mon, Wed 10:00 AM - 11:30 AM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            code: "CSE311",
            title: "Database Systems",
            description:
              "This course covers the fundamental concepts of database systems. Topics include data models, relational algebra, SQL, database design, and transaction processing.",
            credits: 3,
            room: "Room 205",
            schedule: "Tue, Thu 9:00 AM - 10:30 AM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

        setStudentCounts({
          "1": 45,
          "2": 38,
        })
      }
    }
  }, [loading, courses.length, user])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Courses</h1>
      <p className="mt-1 text-gray-400">
        {user?.role === "student" ? "Your enrolled courses" : "Courses you are teaching"}
      </p>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-card p-6 rounded-lg border border-gray-800 cursor-pointer hover:border-purple-600 transition-colors"
              onClick={() => setSelectedCourse(course)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-white">{course.code}</h3>
                  <p className="text-gray-400">{course.title}</p>
                </div>
                <div className="bg-purple-600 px-2 py-1 rounded text-xs text-white">{course.credits} Credits</div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-300">
                  <span className="font-medium">Schedule:</span> {course.schedule}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-medium">Room:</span> {course.room}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-medium">{user?.role === "student" ? "Instructor:" : "Students:"}</span>{" "}
                  {user?.role === "student"
                    ? instructors[course.id] || "Not assigned"
                    : `${studentCounts[course.id] || 0} students`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedCourse.code}</h2>
                  <p className="text-lg text-gray-300">{selectedCourse.title}</p>
                </div>
                <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-md font-medium text-white">Description</h3>
                  <p className="text-gray-300 mt-1">{selectedCourse.description}</p>
                </div>

                <div>
                  <h3 className="text-md font-medium text-white">Course Details</h3>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Credits</p>
                      <p className="text-gray-300">{selectedCourse.credits}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Schedule</p>
                      <p className="text-gray-300">{selectedCourse.schedule}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Room</p>
                      <p className="text-gray-300">{selectedCourse.room}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">{user?.role === "student" ? "Instructor" : "Students"}</p>
                      <p className="text-gray-300">
                        {user?.role === "student"
                          ? instructors[selectedCourse.id] || "Not assigned"
                          : `${studentCounts[selectedCourse.id] || 0} students`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
