"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft, CheckCircle2, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

export default function EvaluateCoursePage({ params }: { params: { id: string } }) {
  const courseId = params.id
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentSemester, setCurrentSemester] = useState<string>("")
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [formData, setFormData] = useState({
    teaching_quality: 0,
    course_content: 0,
    course_materials: 0,
    workload: 0,
    organization: 0,
    overall_rating: 0,
    strengths: "",
    improvements: "",
    additional_comments: "",
  })

  useEffect(() => {
    async function fetchCourseAndCheckSubmission() {
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

        let semester
        if (semesterError) {
          console.error("Error getting current semester:", semesterError)
          // Fall back to hardcoded current semester
          const currentDate = new Date()
          const currentYear = currentDate.getFullYear()
          const currentMonth = currentDate.getMonth() + 1

          if (currentMonth >= 1 && currentMonth <= 4) {
            semester = `Spring ${currentYear}`
          } else if (currentMonth >= 5 && currentMonth <= 8) {
            semester = `Summer ${currentYear}`
          } else {
            semester = `Fall ${currentYear}`
          }
        } else {
          semester = semesterData
        }

        setCurrentSemester(semester)

        // Get course details
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single()

        if (courseError) throw new Error(courseError.message)
        setCourse(courseData)

        // Check if user is enrolled in this course
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user.id)
          .eq("course_id", courseId)

        if (enrollmentError) throw new Error(enrollmentError.message)
        if (!enrollmentData || enrollmentData.length === 0) {
          throw new Error("You are not enrolled in this course")
        }

        // Check if user has already submitted an evaluation for this course
        const { data: submissionData, error: submissionError } = await supabase
          .from("evaluation_submissions")
          .select("*")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .eq("semester", semester)

        if (submissionError) throw new Error(submissionError.message)
        if (submissionData && submissionData.length > 0) {
          setAlreadySubmitted(true)
        }
      } catch (err: any) {
        console.error("Error fetching course:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCourseAndCheckSubmission()
  }, [courseId, supabase])

  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw new Error(userError.message)
      if (!user) throw new Error("User not authenticated")

      // Validate form data
      const requiredRatings = [
        "teaching_quality",
        "course_content",
        "course_materials",
        "workload",
        "organization",
        "overall_rating",
      ]
      for (const field of requiredRatings) {
        if (!formData[field as keyof typeof formData]) {
          throw new Error(`Please provide a rating for all categories`)
        }
      }

      // Submit the anonymous evaluation
      const { error: evaluationError } = await supabase.from("course_evaluations").insert({
        course_id: courseId,
        semester: currentSemester,
        teaching_quality: formData.teaching_quality,
        course_content: formData.course_content,
        course_materials: formData.course_materials,
        workload: formData.workload,
        organization: formData.organization,
        overall_rating: formData.overall_rating,
        strengths: formData.strengths,
        improvements: formData.improvements,
        additional_comments: formData.additional_comments,
      })

      if (evaluationError) throw new Error(evaluationError.message)

      // Record that the user has submitted an evaluation (without linking to the specific evaluation)
      const { error: submissionError } = await supabase.from("evaluation_submissions").insert({
        user_id: user.id,
        course_id: courseId,
        semester: currentSemester,
      })

      if (submissionError) throw new Error(submissionError.message)

      setSuccess(true)

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/evaluations")
      }, 3000)
    } catch (err: any) {
      console.error("Error submitting evaluation:", err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Loading Course Evaluation...</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent className="space-y-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-5 w-1/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="h-4 w-4 bg-gray-200 rounded-full animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
            <div className="h-24 w-full bg-gray-200 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Evaluations
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (success) {
    return (
      <div className="container mx-auto p-4">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Evaluation Submitted</AlertTitle>
          <AlertDescription className="text-green-700">
            Thank you for submitting your course evaluation. Your feedback is valuable and will help improve the course.
            Redirecting you back to the evaluations page...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (alreadySubmitted) {
    return (
      <div className="container mx-auto p-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Evaluations
        </Button>

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Already Evaluated</AlertTitle>
          <AlertDescription className="text-blue-700">
            You have already submitted an evaluation for this course this semester. Each student can only submit one
            evaluation per course per semester.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Course Evaluation</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {course?.course_code}: {course?.title}
          </CardTitle>
          <CardDescription>
            {currentSemester} • {course?.credits} Credits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Your feedback is anonymous</AlertTitle>
              <AlertDescription className="text-blue-700">
                This evaluation is completely anonymous. Your instructor will only see aggregated results and will not
                be able to identify your individual responses.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              <h3 className="text-lg font-medium">Course Ratings</h3>
              <p className="text-sm text-gray-500">
                Please rate the following aspects of the course from 1 (Poor) to 5 (Excellent).
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Teaching Quality</Label>
                  <RadioGroup
                    className="flex space-x-4"
                    value={formData.teaching_quality.toString()}
                    onValueChange={(value) => handleInputChange("teaching_quality", Number.parseInt(value))}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div key={value} className="flex flex-col items-center space-y-1">
                        <RadioGroupItem value={value.toString()} id={`teaching-${value}`} />
                        <Label htmlFor={`teaching-${value}`} className="text-xs">
                          {value}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <div className="flex justify-between text-xs text-gray-500 px-2">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Course Content</Label>
                  <RadioGroup
                    className="flex space-x-4"
                    value={formData.course_content.toString()}
                    onValueChange={(value) => handleInputChange("course_content", Number.parseInt(value))}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div key={value} className="flex flex-col items-center space-y-1">
                        <RadioGroupItem value={value.toString()} id={`course-content-${value}`} />
                        <Label htmlFor={`course-content-${value}`} className="text-xs">
                          {value}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <div className="flex justify-between text-xs text-gray-500 px-2">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Course Materials</Label>
                  <RadioGroup
                    className="flex space-x-4"
                    value={formData.course_materials.toString()}
                    onValueChange={(value) => handleInputChange("course_materials", Number.parseInt(value))}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div key={value} className="flex flex-col items-center space-y-1">
                        <RadioGroupItem value={value.toString()} id={`materials-${value}`} />
                        <Label htmlFor={`materials-${value}`} className="text-xs">
                          {value}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <div className="flex justify-between text-xs text-gray-500 px-2">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Workload</Label>
                  <RadioGroup
                    className="flex space-x-4"
                    value={formData.workload.toString()}
                    onValueChange={(value) => handleInputChange("workload", Number.parseInt(value))}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div key={value} className="flex flex-col items-center space-y-1">
                        <RadioGroupItem value={value.toString()} id={`workload-${value}`} />
                        <Label htmlFor={`workload-${value}`} className="text-xs">
                          {value}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <div className="flex justify-between text-xs text-gray-500 px-2">
                    <span>Too Light</span>
                    <span>Too Heavy</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Organization</Label>
                  <RadioGroup
                    className="flex space-x-4"
                    value={formData.organization.toString()}
                    onValueChange={(value) => handleInputChange("organization", Number.parseInt(value))}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div key={value} className="flex flex-col items-center space-y-1">
                        <RadioGroupItem value={value.toString()} id={`organization-${value}`} />
                        <Label htmlFor={`organization-${value}`} className="text-xs">
                          {value}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <div className="flex justify-between text-xs text-gray-500 px-2">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Overall Rating</Label>
                  <RadioGroup
                    className="flex space-x-4"
                    value={formData.overall_rating.toString()}
                    onValueChange={(value) => handleInputChange("overall_rating", Number.parseInt(value))}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div key={value} className="flex flex-col items-center space-y-1">
                        <RadioGroupItem value={value.toString()} id={`overall-${value}`} />
                        <Label htmlFor={`overall-${value}`} className="text-xs">
                          {value}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <div className="flex justify-between text-xs text-gray-500 px-2">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-6">
              <h3 className="text-lg font-medium">Written Feedback</h3>
              <p className="text-sm text-gray-500">Please provide detailed feedback to help improve the course.</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="strengths">Course Strengths</Label>
                  <Textarea
                    id="strengths"
                    placeholder="What aspects of the course were most effective for your learning?"
                    value={formData.strengths}
                    onChange={(e) => handleInputChange("strengths", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="improvements">Areas for Improvement</Label>
                  <Textarea
                    id="improvements"
                    placeholder="What aspects of the course could be improved?"
                    value={formData.improvements}
                    onChange={(e) => handleInputChange("improvements", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_comments">Additional Comments</Label>
                  <Textarea
                    id="additional_comments"
                    placeholder="Any other feedback you'd like to provide?"
                    value={formData.additional_comments}
                    onChange={(e) => handleInputChange("additional_comments", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Evaluation"}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            By submitting this evaluation, you acknowledge that your feedback will be used to improve course quality.
            Your responses are anonymous and cannot be traced back to you.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
