"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Loader2, Users, Calendar, BookOpen, Star, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type CourseDetailsProps = {
  params: {
    id: string
  }
}

export default function CourseDetails({ params }: CourseDetailsProps) {
  const { id } = params
  const router = useRouter()
  const { user } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [course, setCourse] = useState<any>(null)
  const [instructor, setInstructor] = useState<any>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [hasEvaluated, setHasEvaluated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSemester, setCurrentSemester] = useState("")

  useEffect(() => {
    // Determine current semester (Spring, Summer, Fall, Winter + Year)
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    let semester = ""
    if (month >= 0 && month < 3) semester = "Winter"
    else if (month >= 3 && month < 6) semester = "Spring"
    else if (month >= 6 && month < 9) semester = "Summer"
    else semester = "Fall"

    setCurrentSemester(`${semester} ${year}`)

    const fetchCourseDetails = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", id)
          .single()

        if (courseError) throw courseError
        setCourse(courseData)

        // Fetch instructor
        const { data: teachingData, error: teachingError } = await supabase
          .from("teaching_assignments")
          .select("user_id")
          .eq("course_id", id)
          .single()

        if (teachingError && teachingError.code !== "PGRST116") {
          console.error("Error fetching teaching assignment:", teachingError)
        }

        if (teachingData) {
          const { data: instructorData, error: instructorError } = await supabase
            .from("users")
            .select("id, name, department")
            .eq("id", teachingData.user_id)
            .single()

          if (instructorError) {
            console.error("Error fetching instructor:", instructorError)
          } else {
            setInstructor(instructorData)
          }
        }

        // Count enrolled students
        const { count: enrollmentCount, error: countError } = await supabase
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .eq("course_id", id)

        if (countError) {
          console.error("Error counting enrollments:", countError)
        } else {
          setStudentCount(enrollmentCount || 0)
        }

        // Check if current user is enrolled
        if (user.role === "student") {
          const { data: enrollment, error: enrollmentError } = await supabase
            .from("enrollments")
            .select("id")
            .eq("user_id", user.id)
            .eq("course_id", id)
            .single()

          if (enrollmentError && enrollmentError.code !== "PGRST116") {
            console.error("Error checking enrollment:", enrollmentError)
          }

          setIsEnrolled(!!enrollment)

          // Check if student has already evaluated this course
          const { data: hasSubmitted, error: checkError } = await supabase.rpc("has_submitted_evaluation", {
            student_id: user.id,
            course_id: id,
            semester: currentSemester,
          })

          if (checkError) {
            console.error("Error checking evaluation status:", checkError)
          } else {
            setHasEvaluated(!!hasSubmitted)
          }
        }
      } catch (err: any) {
        console.error("Error fetching course details:", err)
        setError(err.message || "Failed to load course details")
      } finally {
        setLoading(false)
      }
    }

    fetchCourseDetails()
  }, [id, user, supabase, currentSemester])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="max-w-3xl mx-auto my-8 px-4">
        <Alert className="bg-red-50 border-red-200">
          <AlertTitle className="text-red-800">Error</AlertTitle>
          <AlertDescription className="text-red-700">{error || "Course not found"}</AlertDescription>
        </Alert>

        <div className="mt-6 flex justify-center">
          <Button onClick={() => router.push("/dashboard/courses")}>Return to Courses</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto my-8 px-4">
      <div className="mb-6">
        <div className="flex items-center text-sm text-gray-400 mb-2">
          <Button
            variant="link"
            className="p-0 h-auto text-gray-400 hover:text-white"
            onClick={() => router.push("/dashboard/courses")}
          >
            Courses
          </Button>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="text-gray-300">{course.code}</span>
        </div>

        <h1 className="text-2xl font-semibold text-white">
          {course.code}: {course.title}
        </h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="bg-purple-900/20 border-purple-800/50">
            {course.credits} Credits
          </Badge>
          {instructor && (
            <Badge variant="outline" className="bg-blue-900/20 border-blue-800/50">
              Instructor: {instructor.name}
            </Badge>
          )}
          <Badge variant="outline" className="bg-gray-800">
            {currentSemester}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-gray-800">
            <CardHeader>
              <CardTitle>Course Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">{course.description || "No description available."}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-gray-800">
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-purple-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium">Schedule</p>
                    <p className="text-gray-400">{course.schedule || "Not specified"}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <BookOpen className="h-5 w-5 text-purple-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium">Room</p>
                    <p className="text-gray-400">{course.room || "Not specified"}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Users className="h-5 w-5 text-purple-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium">Enrolled Students</p>
                    <p className="text-gray-400">{studentCount}</p>
                  </div>
                </div>

                {instructor && (
                  <div className="flex items-start">
                    <Star className="h-5 w-5 text-purple-500 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium">Department</p>
                      <p className="text-gray-400">{instructor.department || "Not specified"}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {user?.role === "student" && isEnrolled && (
            <Card className="bg-card border-gray-800">
              <CardHeader>
                <CardTitle>Course Evaluation</CardTitle>
                <CardDescription>Provide anonymous feedback about this course</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400 mb-4">
                  Your evaluation helps improve the quality of education and assists other students in making informed
                  decisions.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => router.push(`/dashboard/courses/evaluate/${id}`)}
                  className="w-full"
                  disabled={hasEvaluated}
                >
                  {hasEvaluated ? "Already Evaluated" : "Evaluate Course"}
                </Button>
              </CardFooter>
            </Card>
          )}

          <Card className="bg-card border-gray-800">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/dashboard/materials?course=${id}`)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                View Course Materials
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/dashboard/discussions?course=${id}`)}
              >
                <Users className="mr-2 h-4 w-4" />
                View Course Discussions
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/dashboard/assignments?course=${id}`)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                View Assignments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
