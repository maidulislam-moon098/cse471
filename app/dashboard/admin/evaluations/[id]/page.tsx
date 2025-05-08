"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Download, Star, BarChart } from "lucide-react"
import Link from "next/link"

type CourseDetails = {
  id: string
  code: string
  title: string
}

type EvaluationStats = {
  count: number
  teaching_quality: number[]
  course_content: number[]
  course_materials: number[]
  workload: number[]
  organization: number[]
  overall_rating: number[]
  avg_teaching_quality: number
  avg_course_content: number
  avg_course_materials: number
  avg_workload: number
  avg_organization: number
  avg_overall_rating: number
}

type EvaluationComment = {
  strengths: string | null
  improvements: string | null
  additional_comments: string | null
}

export default function CourseEvaluationDetails() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const courseId = params.id as string
  const semester = searchParams.get("semester") || ""

  const [course, setCourse] = useState<CourseDetails | null>(null)
  const [stats, setStats] = useState<EvaluationStats | null>(null)
  const [comments, setComments] = useState<EvaluationComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    // Redirect non-admin users
    if (user && user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    const fetchEvaluationDetails = async () => {
      if (!user || user.role !== "admin" || !courseId || !semester) return

      try {
        setLoading(true)

        // Get course details
        if (courseId.startsWith("mock")) {
          // For mock data
          if (courseId === "mock-1") {
            setCourse({
              id: "mock-1",
              code: "CSE471",
              title: "System Analysis and Design",
            })
          } else if (courseId === "mock-2") {
            setCourse({
              id: "mock-2",
              code: "CSE331",
              title: "Data Structures",
            })
          } else if (courseId === "mock-3") {
            setCourse({
              id: "mock-3",
              code: "CSE482",
              title: "Internet and Web Technology",
            })
          } else {
            setCourse({
              id: "mock-4",
              code: "CSE311",
              title: "Database Systems",
            })
          }

          // Set mock stats and comments
          setMockData()
        } else {
          // For real data
          const { data: courseData, error: courseError } = await supabase
            .from("courses")
            .select("id, code, title")
            .eq("id", courseId)
            .single()

          if (courseError) {
            console.error("Error fetching course details:", courseError)
            throw courseError
          }

          setCourse(courseData)

          // Get evaluation data
          const { data: evaluations, error: evaluationsError } = await supabase
            .from("course_evaluations")
            .select("*")
            .eq("course_id", courseId)
            .eq("semester", semester)

          if (evaluationsError) {
            console.error("Error fetching evaluations:", evaluationsError)
            throw evaluationsError
          }

          if (!evaluations || evaluations.length === 0) {
            setMockData()
            return
          }

          // Process evaluation data
          const teachingQuality = Array(5).fill(0)
          const courseContent = Array(5).fill(0)
          const courseMaterials = Array(5).fill(0)
          const workload = Array(5).fill(0)
          const organization = Array(5).fill(0)
          const overallRating = Array(5).fill(0)

          let sumTeachingQuality = 0
          let sumCourseContent = 0
          let sumCourseMaterials = 0
          let sumWorkload = 0
          let sumOrganization = 0
          let sumOverallRating = 0

          evaluations.forEach((evaluation) => {
            teachingQuality[evaluation.teaching_quality - 1]++
            courseContent[evaluation.course_content - 1]++
            courseMaterials[evaluation.course_materials - 1]++
            workload[evaluation.workload - 1]++
            organization[evaluation.organization - 1]++
            overallRating[evaluation.overall_rating - 1]++

            sumTeachingQuality += evaluation.teaching_quality
            sumCourseContent += eval.course_content
            sumCourseMaterials += eval.course_materials
            sumWorkload += eval.workload
            sumOrganization += eval.organization
            sumOverallRating += eval.overall_rating
          })

          setStats({
            count: evaluations.length,
            teaching_quality: teachingQuality,
            course_content: courseContent,
            course_materials: courseMaterials,
            workload: workload,
            organization: organization,
            overall_rating: overallRating,
            avg_teaching_quality: Number.parseFloat((sumTeachingQuality / evaluations.length).toFixed(1)),
            avg_course_content: Number.parseFloat((sumCourseContent / evaluations.length).toFixed(1)),
            avg_course_materials: Number.parseFloat((sumCourseMaterials / evaluations.length).toFixed(1)),
            avg_workload: Number.parseFloat((sumWorkload / evaluations.length).toFixed(1)),
            avg_organization: Number.parseFloat((sumOrganization / evaluations.length).toFixed(1)),
            avg_overall_rating: Number.parseFloat((sumOverallRating / evaluations.length).toFixed(1)),
          })

          // Get comments
          const evaluationComments = evaluations.map((eval) => ({
            strengths: eval.strengths,
            improvements: eval.improvements,
            additional_comments: eval.additional_comments,
          }))

          setComments(evaluationComments)
        }
      } catch (error) {
        console.error("Error fetching evaluation details:", error)
        setError("Failed to load evaluation details. Please try again later.")
        // Set mock data on error
        setMockData()
      } finally {
        setLoading(false)
      }
    }

    fetchEvaluationDetails()
  }, [user, courseId, semester, router])

  // Function to set mock data
  const setMockData = () => {
    console.log("Setting mock evaluation details")

    // Mock statistics
    setStats({
      count: 25,
      teaching_quality: [1, 2, 5, 8, 9],
      course_content: [0, 1, 3, 12, 9],
      course_materials: [2, 3, 5, 10, 5],
      workload: [1, 4, 8, 7, 5],
      organization: [0, 2, 4, 10, 9],
      overall_rating: [0, 2, 3, 12, 8],
      avg_teaching_quality: 4.2,
      avg_course_content: 4.5,
      avg_course_materials: 3.8,
      avg_workload: 4.0,
      avg_organization: 4.3,
      avg_overall_rating: 4.2,
    })

    // Mock comments
    setComments([
      {
        strengths:
          "The professor was very knowledgeable and explained complex concepts clearly. The assignments were challenging but helped reinforce the material.",
        improvements: "The course materials could be updated to include more recent examples and case studies.",
        additional_comments: "Overall a great course that prepared me well for advanced topics.",
      },
      {
        strengths:
          "Interactive lectures and practical assignments made the course engaging. The group project was particularly valuable.",
        improvements: "More feedback on assignments would be helpful for improvement.",
        additional_comments: null,
      },
      {
        strengths:
          "The course structure was logical and built concepts progressively. The professor was always available during office hours.",
        improvements: "The workload was sometimes excessive, especially during midterms week.",
        additional_comments: "Would recommend this course to other students interested in this field.",
      },
      {
        strengths:
          "Real-world examples helped connect theory to practice. The professor's industry experience added valuable insights.",
        improvements: null,
        additional_comments: "One of the most useful courses I've taken in my program.",
      },
      {
        strengths:
          "Clear explanations and well-organized lectures. The online resources were very helpful for studying.",
        improvements: "The textbook wasn't very useful compared to the lecture notes.",
        additional_comments: null,
      },
    ])
  }

  // Function to render rating stars
  const renderRatingStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${star <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`}
          />
        ))}
        <span className="ml-2 text-lg text-white">{rating.toFixed(1)}</span>
      </div>
    )
  }

  // Function to render rating distribution
  const renderRatingDistribution = (ratings: number[], total: number) => {
    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratings[rating - 1]
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0

          return (
            <div key={rating} className="flex items-center">
              <span className="text-sm text-gray-400 w-8">{rating} ★</span>
              <div className="flex-1 mx-2">
                <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
              <span className="text-sm text-gray-400 w-16">
                {count} ({percentage}%)
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // Function to export data as CSV
  const exportToCSV = () => {
    if (!course || !stats) return

    // Prepare ratings distribution data
    const distributionData = [
      ["Rating", "Teaching Quality", "Course Content", "Course Materials", "Workload", "Organization", "Overall Rating"],
      ["5", stats.teaching_quality[4], stats.course_content[4], stats  "Overall Rating"],
      ["5", stats.teaching_quality[4], stats.course_content[4], stats.course_materials[4], stats.workload[4], stats.organization[4], stats.overall_rating[4]],
      ["4", stats.teaching_quality[3], stats.course_content[3], stats.course_materials[3], stats.workload[3], stats.organization[3], stats.overall_rating[3]],
      ["3", stats.teaching_quality[2], stats.course_content[2], stats.course_materials[2], stats.workload[2], stats.organization[2], stats.overall_rating[2]],
      ["2", stats.teaching_quality[1], stats.course_content[1], stats.course_materials[1], stats.workload[1], stats.organization[1], stats.overall_rating[1]],
      ["1", stats.teaching_quality[0], stats.course_content[0], stats.course_materials[0], stats.workload[0], stats.organization[0], stats.overall_rating[0]]
    ]

    // Prepare average ratings data
    const averageData = [
      ["Metric", "Average Rating"],
      ["Teaching Quality", stats.avg_teaching_quality],
      ["Course Content", stats.avg_course_content],
      ["Course Materials", stats.avg_course_materials],
      ["Workload", stats.avg_workload],
      ["Organization", stats.avg_organization],
      ["Overall Rating", stats.avg_overall_rating],
    ]

    // Prepare comments data
    const commentsData = [
      ["Strengths", "Improvements", "Additional Comments"],
      ...comments.map((comment) => [
        `"${comment.strengths || ""}"`,
        `"${comment.improvements || ""}"`,
        `"${comment.additional_comments || ""}"`,
      ]),
    ]

    // Combine all data
    const csvRows = [
      [`Course Evaluation Report: ${course.code} - ${course.title}, ${semester}`],
      [`Total Responses: ${stats.count}`],
      [""],
      ["Rating Distribution"],
      ...distributionData,
      [""],
      ["Average Ratings"],
      ...averageData,
      [""],
      ["Anonymous Comments"],
      ...commentsData,
    ]

    const csvString = csvRows.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${course.code}-evaluation-${semester}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // If user is not admin, show loading while redirecting
  if (user && user.role !== "admin") {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        href="/dashboard/admin/evaluations"
        className="flex items-center text-purple-400 hover:text-purple-300 mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Evaluations
      </Link>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : error ? (
        <div className="mt-4 p-3 bg-red-900 text-red-300 rounded">
          <p>{error}</p>
        </div>
      ) : course && stats ? (
        <>
          <div className="bg-card p-6 rounded-lg border border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl font-semibold text-white">
                  {course.code}: {course.title}
                </h1>
                <p className="mt-1 text-gray-400">Semester: {semester}</p>
                <div className="mt-2 inline-block bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-sm">
                  {stats.count} {stats.count === 1 ? "Response" : "Responses"}
                </div>
              </div>

              <button onClick={exportToCSV} className="btn-secondary flex items-center mt-4 md:mt-0">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-medium text-white mb-4 flex items-center">
                  <BarChart className="mr-2 h-5 w-5 text-purple-400" />
                  Rating Summary
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Overall Rating</h3>
                    <div className="flex items-center mb-4">{renderRatingStars(stats.avg_overall_rating)}</div>
                    {renderRatingDistribution(stats.overall_rating, stats.count)}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Teaching Quality</h3>
                    <div className="flex items-center mb-4">{renderRatingStars(stats.avg_teaching_quality)}</div>
                    {renderRatingDistribution(stats.teaching_quality, stats.count)}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Course Content</h3>
                    <div className="flex items-center mb-4">{renderRatingStars(stats.avg_course_content)}</div>
                    {renderRatingDistribution(stats.course_content, stats.count)}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-medium text-white mb-4 flex items-center">
                  <Star className="mr-2 h-5 w-5 text-purple-400" />
                  Additional Metrics
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Course Materials</h3>
                    <div className="flex items-center mb-4">{renderRatingStars(stats.avg_course_materials)}</div>
                    {renderRatingDistribution(stats.course_materials, stats.count)}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Workload Appropriateness</h3>
                    <div className="flex items-center mb-4">{renderRatingStars(stats.avg_workload)}</div>
                    {renderRatingDistribution(stats.workload, stats.count)}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Organization and Structure</h3>
                    <div className="flex items-center mb-4">{renderRatingStars(stats.avg_organization)}</div>
                    {renderRatingDistribution(stats.organization, stats.count)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-card p-6 rounded-lg border border-gray-800">
            <h2 className="text-xl font-medium text-white mb-4">Anonymous Feedback</h2>

            {comments.length === 0 ? (
              <p className="text-gray-400">No written feedback available for this course.</p>
            ) : (
              <div className="space-y-6">
                {comments.map((comment, index) => (
                  <div key={index} className="p-4 bg-gray-800 rounded-lg">
                    {comment.strengths && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-green-400 mb-1">Course Strengths:</h4>
                        <p className="text-gray-300">{comment.strengths}</p>
                      </div>
                    )}

                    {comment.improvements && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-yellow-400 mb-1">Areas for Improvement:</h4>
                        <p className="text-gray-300">{comment.improvements}</p>
                      </div>
                    )}

                    {comment.additional_comments && (
                      <div>
                        <h4 className="text-sm font-medium text-blue-400 mb-1">Additional Comments:</h4>
                        <p className="text-gray-300">{comment.additional_comments}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-card p-6 rounded-lg border border-gray-800">
          <h1 className="text-2xl font-semibold text-white">Course Not Found</h1>
          <p className="mt-4 text-gray-300">The course evaluation data you are looking for could not be found.</p>
        </div>
      )}
    </div>
  )
}
