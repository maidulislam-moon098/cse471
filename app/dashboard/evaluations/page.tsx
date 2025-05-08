"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle2, ClipboardCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function EvaluationsPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittedEvaluations, setSubmittedEvaluations] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true)

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw new Error(userError.message)
        if (!user) throw new Error("User not authenticated")

        // Get current semester
        const { data: semesterData, error: semesterError } = await supabase.rpc("get_current_semester")

        if (semesterError) {
          console.error("Error getting current semester:", semesterError)
          // Fall back to hardcoded current semester
          const currentDate = new Date()
          const currentYear = currentDate.getFullYear()
          const currentMonth = currentDate.getMonth() + 1

          let currentSemester
          if (currentMonth >= 1 && currentMonth <= 4) {
            currentSemester = `Spring ${currentYear}`
          } else if (currentMonth >= 5 && currentMonth <= 8) {
            currentSemester = `Summer ${currentYear}`
          } else {
            currentSemester = `Fall ${currentYear}`
          }

          // Get enrolled courses for the student
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from("enrollments")
            .select(`
              course_id,
              courses:course_id (
                id,
                course_code,
                title,
                description,
                credits
              )
            `)
            .eq("user_id", user.id)

          if (enrollmentError) throw new Error(enrollmentError.message)

          // Check which courses have already been evaluated
          const { data: submittedData, error: submittedError } = await supabase
            .from("evaluation_submissions")
            .select("course_id")
            .eq("user_id", user.id)
            .eq("semester", currentSemester)

          if (submittedError) throw new Error(submittedError.message)

          // Create a map of course_id to boolean indicating if evaluation was submitted
          const submittedMap: Record<string, boolean> = {}
          submittedData?.forEach((item) => {
            submittedMap[item.course_id] = true
          })

          setSubmittedEvaluations(submittedMap)

          // Format the courses data
          const formattedCourses =
            enrollmentData?.map((enrollment) => ({
              ...enrollment.courses,
              semester: currentSemester,
            })) || []

          setCourses(formattedCourses)
        } else {
          const currentSemester = semesterData

          // Get enrolled courses for the student
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from("enrollments")
            .select(`
              course_id,
              courses:course_id (
                id,
                course_code,
                title,
                description,
                credits
              )
            `)
            .eq("user_id", user.id)

          if (enrollmentError) throw new Error(enrollmentError.message)

          // Check which courses have already been evaluated
          const { data: submittedData, error: submittedError } = await supabase
            .from("evaluation_submissions")
            .select("course_id")
            .eq("user_id", user.id)
            .eq("semester", currentSemester)

          if (submittedError) throw new Error(submittedError.message)

          // Create a map of course_id to boolean indicating if evaluation was submitted
          const submittedMap: Record<string, boolean> = {}
          submittedData?.forEach((item) => {
            submittedMap[item.course_id] = true
          })

          setSubmittedEvaluations(submittedMap)

          // Format the courses data
          const formattedCourses =
            enrollmentData?.map((enrollment) => ({
              ...enrollment.courses,
              semester: currentSemester,
            })) || []

          setCourses(formattedCourses)
        }
      } catch (err: any) {
        console.error("Error fetching courses:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [supabase])

  const handleEvaluate = (courseId: string) => {
    router.push(`/dashboard/evaluations/submit/${courseId}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">Course Evaluations</h1>
        <p className="text-gray-500 mb-6">Provide feedback on your courses to help improve the learning experience.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load course evaluations: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Course Evaluations</h1>
          <p className="text-gray-500">Provide feedback on your courses to help improve the learning experience.</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No courses found</AlertTitle>
          <AlertDescription>You are not currently enrolled in any courses that require evaluation.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{course.course_code}</CardTitle>
                  {submittedEvaluations[course.id] ? (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Evaluated
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Pending
                    </Badge>
                  )}
                </div>
                <CardDescription>{course.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {course.description || "No description available."}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {course.semester} • {course.credits} Credits
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleEvaluate(course.id)}
                  className="w-full"
                  variant={submittedEvaluations[course.id] ? "outline" : "default"}
                  disabled={submittedEvaluations[course.id]}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {submittedEvaluations[course.id] ? "Already Evaluated" : "Evaluate Course"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <AlertTitle className="text-blue-800">Your feedback is anonymous</AlertTitle>
        <AlertDescription className="text-blue-700">
          All course evaluations are completely anonymous. Your instructors will only see aggregated results and will
          not be able to identify individual responses.
        </AlertDescription>
      </Alert>
    </div>
  )
}
