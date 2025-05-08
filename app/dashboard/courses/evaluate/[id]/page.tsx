"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

type CourseEvaluationProps = {
  params: {
    id: string
  }
}

export default function CourseEvaluation({ params }: CourseEvaluationProps) {
  const { id } = params
  const router = useRouter()
  const { user } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [currentSemester, setCurrentSemester] = useState("")

  // Form state
  const [teachingRating, setTeachingRating] = useState<number | null>(null)
  const [contentRating, setContentRating] = useState<number | null>(null)
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null)
  const [workloadRating, setWorkloadRating] = useState<number | null>(null)
  const [overallRating, setOverallRating] = useState<number | null>(null)
  const [strengths, setStrengths] = useState("")
  const [improvements, setImprovements] = useState("")
  const [additionalComments, setAdditionalComments] = useState("")

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

    const fetchCourseAndCheckSubmission = async () => {
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

        // Check if student is enrolled
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user.id)
          .eq("course_id", id)
          .single()

        if (enrollmentError && enrollmentError.code !== "PGRST116") {
          throw enrollmentError
        }

        if (!enrollmentData) {
          router.push("/dashboard/courses")
          return
        }

        // Check if student has already submitted an evaluation
        const { data: hasSubmitted, error: checkError } = await supabase.rpc("has_submitted_evaluation", {
          student_id: user.id,
          course_id: id,
          semester: currentSemester,
        })

        if (checkError) throw checkError

        if (hasSubmitted) {
          setAlreadySubmitted(true)
        }
      } catch (err: any) {
        console.error("Error fetching course:", err)
        setError(err.message || "Failed to load course information")
      } finally {
        setLoading(false)
      }
    }

    fetchCourseAndCheckSubmission()
  }, [id, user, router, supabase, currentSemester])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    // Validate form
    if (!teachingRating || !contentRating || !difficultyRating || !workloadRating || !overallRating) {
      setError("Please provide ratings for all categories")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Generate submission hash on the server
      const { data: submissionHash, error: hashError } = await supabase.rpc("generate_evaluation_hash", {
        student_id: user.id,
        course_id: id,
        semester: currentSemester,
      })

      if (hashError) throw hashError

      // Submit evaluation
      const { error: submitError } = await supabase.from("course_evaluations").insert({
        course_id: id,
        semester: currentSemester,
        teaching_rating: teachingRating,
        content_rating: contentRating,
        difficulty_rating: difficultyRating,
        workload_rating: workloadRating,
        overall_rating: overallRating,
        strengths: strengths.trim() || null,
        improvements: improvements.trim() || null,
        additional_comments: additionalComments.trim() || null,
        submission_hash: submissionHash,
      })

      if (submitError) throw submitError

      setSuccess(true)

      // Redirect after a delay
      setTimeout(() => {
        router.push("/dashboard/courses")
      }, 3000)
    } catch (err: any) {
      console.error("Error submitting evaluation:", err)
      setError(err.message || "Failed to submit evaluation")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (alreadySubmitted) {
    return (
      <div className="max-w-3xl mx-auto my-8 px-4">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800">Already Submitted</AlertTitle>
          <AlertDescription className="text-amber-700">
            You have already submitted an evaluation for this course this semester. Thank you for your feedback!
          </AlertDescription>
        </Alert>

        <div className="mt-6 flex justify-center">
          <Button onClick={() => router.push("/dashboard/courses")}>Return to Courses</Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto my-8 px-4">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800">Evaluation Submitted</AlertTitle>
          <AlertDescription className="text-green-700">
            Thank you for submitting your course evaluation! Your feedback helps improve the quality of education.
          </AlertDescription>
        </Alert>

        <div className="mt-6 flex justify-center">
          <Button onClick={() => router.push("/dashboard/courses")}>Return to Courses</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto my-8 px-4">
      <h1 className="text-2xl font-semibold text-white mb-2">Course Evaluation</h1>
      <p className="text-gray-400 mb-6">
        {course?.code}: {course?.title} - {currentSemester}
      </p>

      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-800">Error</AlertTitle>
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card border-gray-800">
        <CardHeader>
          <CardTitle>Anonymous Course Evaluation</CardTitle>
          <CardDescription>
            Your feedback is valuable and completely anonymous. Instructors cannot see who submitted which evaluation.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Teaching Quality */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Teaching Quality</h3>
              <p className="text-sm text-gray-400">
                Rate the instructor's teaching effectiveness, clarity, and responsiveness
              </p>
              <RadioGroup
                value={teachingRating?.toString()}
                onValueChange={(val) => setTeachingRating(Number.parseInt(val))}
              >
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="teaching-1" />
                    <Label htmlFor="teaching-1">Poor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="teaching-2" />
                    <Label htmlFor="teaching-2">Fair</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="teaching-3" />
                    <Label htmlFor="teaching-3">Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4" id="teaching-4" />
                    <Label htmlFor="teaching-4">Very Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="5" id="teaching-5" />
                    <Label htmlFor="teaching-5">Excellent</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Course Content */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Course Content</h3>
              <p className="text-sm text-gray-400">Rate the relevance, organization, and quality of course materials</p>
              <RadioGroup
                value={contentRating?.toString()}
                onValueChange={(val) => setContentRating(Number.parseInt(val))}
              >
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="content-1" />
                    <Label htmlFor="content-1">Poor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="content-2" />
                    <Label htmlFor="content-2">Fair</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="content-3" />
                    <Label htmlFor="content-3">Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4" id="content-4" />
                    <Label htmlFor="content-4">Very Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="5" id="content-5" />
                    <Label htmlFor="content-5">Excellent</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Course Difficulty */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Course Difficulty</h3>
              <p className="text-sm text-gray-400">Rate the overall difficulty level of the course</p>
              <RadioGroup
                value={difficultyRating?.toString()}
                onValueChange={(val) => setDifficultyRating(Number.parseInt(val))}
              >
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="difficulty-1" />
                    <Label htmlFor="difficulty-1">Very Easy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="difficulty-2" />
                    <Label htmlFor="difficulty-2">Easy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="difficulty-3" />
                    <Label htmlFor="difficulty-3">Moderate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4" id="difficulty-4" />
                    <Label htmlFor="difficulty-4">Difficult</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="5" id="difficulty-5" />
                    <Label htmlFor="difficulty-5">Very Difficult</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Workload */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Workload</h3>
              <p className="text-sm text-gray-400">Rate the amount of work required for this course</p>
              <RadioGroup
                value={workloadRating?.toString()}
                onValueChange={(val) => setWorkloadRating(Number.parseInt(val))}
              >
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="workload-1" />
                    <Label htmlFor="workload-1">Very Light</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="workload-2" />
                    <Label htmlFor="workload-2">Light</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="workload-3" />
                    <Label htmlFor="workload-3">Moderate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4" id="workload-4" />
                    <Label htmlFor="workload-4">Heavy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="5" id="workload-5" />
                    <Label htmlFor="workload-5">Very Heavy</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Overall Rating */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Overall Rating</h3>
              <p className="text-sm text-gray-400">Rate your overall satisfaction with this course</p>
              <RadioGroup
                value={overallRating?.toString()}
                onValueChange={(val) => setOverallRating(Number.parseInt(val))}
              >
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="overall-1" />
                    <Label htmlFor="overall-1">Poor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="overall-2" />
                    <Label htmlFor="overall-2">Fair</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="overall-3" />
                    <Label htmlFor="overall-3">Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4" id="overall-4" />
                    <Label htmlFor="overall-4">Very Good</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="5" id="overall-5" />
                    <Label htmlFor="overall-5">Excellent</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Course Strengths */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Course Strengths</h3>
              <p className="text-sm text-gray-400">What aspects of this course were most valuable?</p>
              <Textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Enter course strengths..."
                className="min-h-[100px]"
              />
            </div>

            {/* Areas for Improvement */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Areas for Improvement</h3>
              <p className="text-sm text-gray-400">What aspects of this course could be improved?</p>
              <Textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="Enter suggestions for improvement..."
                className="min-h-[100px]"
              />
            </div>

            {/* Additional Comments */}
            <div className="space-y-3">
              <h3 className="font-medium text-white">Additional Comments</h3>
              <p className="text-sm text-gray-400">Any other feedback you'd like to share?</p>
              <Textarea
                value={additionalComments}
                onChange={(e) => setAdditionalComments(e.target.value)}
                placeholder="Enter additional comments..."
                className="min-h-[100px]"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <p className="text-sm text-amber-400 w-full">
              <AlertCircle className="h-4 w-4 inline-block mr-2" />
              Your evaluation is completely anonymous. Instructors cannot see who submitted which evaluation.
            </p>

            <div className="flex justify-end w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/courses")}
                className="mr-4"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Evaluation"
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
