"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"

export default function AssignmentSubmissions() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  const [assignment, setAssignment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [grade, setGrade] = useState<number | "">("")
  const [feedback, setFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "faculty" || !assignmentId) {
        router.push("/dashboard")
        return
      }

      try {
        setLoading(true)

        // Fetch assignment details
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select(`
            *,
            courses:course_id (id, code, title)
          `)
          .eq("id", assignmentId)
          .single()

        if (assignmentError) throw assignmentError
        if (!assignmentData) throw new Error("Assignment not found")

        // Verify this faculty teaches this course
        const { data: teachingData, error: teachingError } = await supabase
          .from("teaching_assignments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", assignmentData.course_id)
          .single()

        if (teachingError && teachingError.code !== "PGRST116") {
          throw teachingError
        }

        if (!teachingData) {
          router.push("/dashboard/assignments/manage")
          return
        }

        setAssignment(assignmentData)

        // Fetch submissions
        const { data: submissionsData, error: submissionsError } = await supabase
          .from("assignment_submissions")
          .select(`
            *,
            users:user_id (id, name, email)
          `)
          .eq("assignment_id", assignmentId)
          .order("submitted_at", { ascending: false })

        if (submissionsError) throw submissionsError
        setSubmissions(submissionsData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, assignmentId, router])

  const handleSubmissionSelect = (submission: any) => {
    setSelectedSubmission(submission)
    setGrade(submission.grade || "")
    setFeedback(submission.feedback || "")
    setError("")
    setSuccess("")
  }

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !selectedSubmission) return

    try {
      setSubmitting(true)
      setError("")
      setSuccess("")

      // Validate grade
      const numericGrade = Number(grade)
      if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > assignment.max_points) {
        throw new Error(`Grade must be between 0 and ${assignment.max_points}`)
      }

      // Update submission
      const { data, error } = await supabase
        .from("assignment_submissions")
        .update({
          grade: numericGrade,
          feedback,
          status: "graded",
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id)
        .select()

      if (error) throw error

      // Update local state
      setSubmissions(submissions.map((s) => (s.id === selectedSubmission.id ? { ...s, ...data[0] } : s)))
      setSelectedSubmission({ ...selectedSubmission, ...data[0] })

      setSuccess("Submission graded successfully!")

      // Send notification to student
      try {
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedSubmission.user_id,
            type: "assignment_graded",
            title: `Assignment Graded: ${assignment.title}`,
            content: `Your submission for "${assignment.title}" has been graded. Grade: ${numericGrade}/${assignment.max_points}`,
            metadata: {
              assignment_id: assignment.id,
              submission_id: selectedSubmission.id,
              grade: numericGrade,
              max_points: assignment.max_points,
            },
          }),
        })
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError)
      }
    } catch (error: any) {
      console.error("Error grading submission:", error)
      setError(error.message || "Failed to grade submission")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="mt-10 text-center">
        <p className="text-gray-400">Assignment not found.</p>
        <button className="mt-4 btn-primary" onClick={() => router.push("/dashboard/assignments/manage")}>
          Back to Assignments
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Submissions</h1>
        <button className="btn-secondary" onClick={() => router.push("/dashboard/assignments/manage")}>
          Back
        </button>
      </div>
      <p className="mt-1 text-gray-400">
        {assignment.title} | {assignment.courses.code} - {assignment.courses.title}
      </p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card p-4 rounded-lg border border-gray-800">
            <h2 className="text-lg font-medium text-white mb-4">Student Submissions</h2>

            {submissions.length === 0 ? (
              <p className="text-gray-400">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedSubmission?.id === submission.id
                        ? "bg-purple-900/30 border border-purple-600"
                        : "bg-gray-800 hover:bg-gray-700 border border-transparent"
                    }`}
                    onClick={() => handleSubmissionSelect(submission)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">{submission.users.name}</p>
                        <p className="text-xs text-gray-400">{submission.users.email}</p>
                      </div>
                      <div>
                        {submission.status === "graded" ? (
                          <span className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs">Graded</span>
                        ) : (
                          <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs">Submitted</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Submitted: {formatDate(submission.submitted_at)}</p>
                    {submission.status === "graded" && (
                      <p className="text-xs font-medium text-white mt-1">
                        Grade: {submission.grade}/{assignment.max_points}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedSubmission ? (
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-medium text-white">Submission by {selectedSubmission.users.name}</h2>
                  <p className="text-sm text-gray-400">Submitted on {formatDate(selectedSubmission.submitted_at)}</p>
                </div>
                <div>
                  {selectedSubmission.status === "graded" ? (
                    <span className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs">Graded</span>
                  ) : (
                    <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs">Submitted</span>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {selectedSubmission.submission_text && (
                  <div>
                    <h3 className="text-md font-medium text-white mb-2">Submission Text</h3>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedSubmission.submission_text}</p>
                    </div>
                  </div>
                )}

                {selectedSubmission.file_url && (
                  <div>
                    <h3 className="text-md font-medium text-white mb-2">Attachment</h3>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <a
                        href={selectedSubmission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {selectedSubmission.file_name || "Download Attachment"}
                      </a>
                      {selectedSubmission.file_type && (
                        <p className="text-xs text-gray-400 mt-1">Type: {selectedSubmission.file_type}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-800 pt-4 mt-6">
                  <h3 className="text-md font-medium text-white mb-4">Grade Submission</h3>

                  {error && <div className="mb-4 p-3 bg-red-900 text-red-300 rounded">{error}</div>}

                  {success && <div className="mb-4 p-3 bg-green-900 text-green-300 rounded">{success}</div>}

                  <form onSubmit={handleGradeSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="grade" className="block text-sm font-medium text-gray-400 mb-1">
                          Grade (out of {assignment.max_points})
                        </label>
                        <input
                          type="number"
                          id="grade"
                          className="input-field"
                          value={grade}
                          onChange={(e) => setGrade(e.target.value === "" ? "" : Number(e.target.value))}
                          min="0"
                          max={assignment.max_points}
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="feedback" className="block text-sm font-medium text-gray-400 mb-1">
                          Feedback
                        </label>
                        <textarea
                          id="feedback"
                          rows={4}
                          className="input-field"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Provide feedback to the student..."
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <button type="submit" className="btn-primary" disabled={submitting}>
                        {submitting ? "Saving..." : "Save Grade"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card p-6 rounded-lg border border-gray-800 flex items-center justify-center h-full">
              <p className="text-gray-400">
                {submissions.length === 0
                  ? "No submissions available for this assignment."
                  : "Select a submission to view and grade."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
