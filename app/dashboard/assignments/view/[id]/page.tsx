"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"

export default function ViewAssignment() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  const [assignment, setAssignment] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [submissionText, setSubmissionText] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!user || !assignmentId) return

      try {
        setLoading(true)

        // Fetch assignment details
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select(`
            *,
            courses:course_id (id, code, title),
            users:created_by (id, name)
          `)
          .eq("id", assignmentId)
          .single()

        if (assignmentError) throw assignmentError
        if (!assignmentData) throw new Error("Assignment not found")

        setAssignment(assignmentData)

        // Fetch submission if student
        if (user.role === "student") {
          const { data: submissionData, error: submissionError } = await supabase
            .from("assignment_submissions")
            .select("*")
            .eq("assignment_id", assignmentId)
            .eq("user_id", user.id)
            .single()

          if (submissionError && submissionError.code !== "PGRST116") {
            // PGRST116 is "no rows returned" error
            throw submissionError
          }

          if (submissionData) {
            setSubmission(submissionData)
            setSubmissionText(submissionData.submission_text || "")
          }
        }
      } catch (error) {
        console.error("Error fetching assignment:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAssignment()
  }, [user, assignmentId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !assignment) return

    try {
      setSubmitting(true)
      setError("")
      setSuccess("")

      // Upload file if provided
      let fileUrl = null
      let fileName = null
      let fileType = null
      let fileSize = null

      if (file) {
        const fileExt = file.name.split(".").pop()
        const filePath = `submissions/${assignment.id}/${user.id}/${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("assignments")
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("assignments").getPublicUrl(filePath)

        fileUrl = publicUrl
        fileName = file.name
        fileType = file.type
        fileSize = file.size
      }

      // Check if submission already exists
      if (submission) {
        // Update existing submission
        const { data, error } = await supabase
          .from("assignment_submissions")
          .update({
            submission_text: submissionText,
            file_url: fileUrl || submission.file_url || null,
            file_name: fileName || submission.file_name || null,
            file_type: fileType || submission.file_type || null,
            file_size: fileSize || submission.file_size || null,
            submitted_at: new Date().toISOString(),
            status: "submitted",
          })
          .eq("id", submission.id)
          .select()

        if (error) throw error
        setSubmission(data?.[0] || null)
      } else {
        // Create new submission
        const { data, error } = await supabase
          .from("assignment_submissions")
          .insert({
            assignment_id: assignment.id,
            user_id: user.id,
            submission_text: submissionText,
            file_url: fileUrl,
            file_name: fileName,
            file_type: fileType,
            file_size: fileSize,
            status: "submitted",
          })
          .select()

        if (error) throw error
        setSubmission(data[0])
      }

      setSuccess("Assignment submitted successfully!")
    } catch (error: any) {
      console.error("Error submitting assignment:", error)
      setError(error.message || "Failed to submit assignment")
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

  const isOverdue = () => {
    if (!assignment) return false
    const dueDate = new Date(assignment.due_date)
    const now = new Date()
    return dueDate < now && !submission
  }

  const canSubmit = () => {
    if (!assignment || user?.role !== "student") return false
    const dueDate = new Date(assignment.due_date)
    const now = new Date()

    // Allow submission if not graded yet, even if overdue
    return submission?.status !== "graded"
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
        <button className="mt-4 btn-primary" onClick={() => router.push("/dashboard/assignments")}>
          Back to Assignments
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">{assignment.title}</h1>
        <button
          className="btn-secondary"
          onClick={() =>
            router.push(user?.role === "faculty" ? "/dashboard/assignments/manage" : "/dashboard/assignments")
          }
        >
          Back
        </button>
      </div>
      <p className="mt-1 text-gray-400">
        {assignment.courses.code} - {assignment.courses.title}
      </p>

      <div className="mt-6 bg-card p-6 rounded-lg border border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium text-white mb-2">Assignment Details</h2>
            <p className="text-sm text-gray-300">{assignment.description}</p>

            <div className="mt-4 space-y-2">
              <p className="text-sm">
                <span className="text-gray-400">Due Date:</span>{" "}
                <span className={`font-medium ${isOverdue() ? "text-red-400" : "text-white"}`}>
                  {formatDate(assignment.due_date)}
                  {isOverdue() && " (Overdue)"}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-gray-400">Maximum Points:</span>{" "}
                <span className="font-medium text-white">{assignment.max_points}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-400">Created By:</span>{" "}
                <span className="font-medium text-white">{assignment.users.name}</span>
              </p>
              {assignment.file_url && (
                <p className="text-sm">
                  <span className="text-gray-400">Attachment:</span>{" "}
                  <a
                    href={assignment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    {assignment.file_name || "Download"}
                  </a>
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-white mb-2">Instructions</h2>
            <div className="text-sm text-gray-300 whitespace-pre-wrap">{assignment.instructions}</div>
          </div>
        </div>

        {user?.role === "student" && (
          <div className="mt-8 border-t border-gray-800 pt-6">
            <h2 className="text-lg font-medium text-white mb-4">Your Submission</h2>

            {error && <div className="mb-4 p-3 bg-red-900 text-red-300 rounded">{error}</div>}

            {success && <div className="mb-4 p-3 bg-green-900 text-green-300 rounded">{success}</div>}

            {submission?.status === "graded" ? (
              <div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-medium text-white">Graded Submission</h3>
                    <span className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs">Graded</span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Submitted on:</p>
                      <p className="text-sm text-white">{formatDate(submission.submitted_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Grade:</p>
                      <p className="text-md font-medium text-white">
                        {submission.grade !== null && submission.grade !== undefined ? submission.grade : "Not graded"}/
                        {assignment?.max_points || 0}
                      </p>
                    </div>
                  </div>

                  {submission.feedback && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-400">Feedback:</p>
                      <p className="text-sm text-white mt-1 whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  )}

                  {submission.submission_text && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-400">Your submission:</p>
                      <p className="text-sm text-white mt-1 whitespace-pre-wrap">{submission.submission_text}</p>
                    </div>
                  )}

                  {submission.file_url && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-400">Your attachment:</p>
                      <a
                        href={submission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        {submission.file_name || "Download"}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : canSubmit() ? (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="submissionText" className="block text-sm font-medium text-gray-400 mb-1">
                      Submission Text
                    </label>
                    <textarea
                      id="submissionText"
                      rows={6}
                      className="input-field"
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      placeholder="Enter your submission here..."
                    />
                  </div>

                  <div>
                    <label htmlFor="file" className="block text-sm font-medium text-gray-400 mb-1">
                      Attachment (Optional)
                    </label>
                    <input
                      type="file"
                      id="file"
                      className="block w-full text-sm text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded file:border-0
                        file:text-sm file:font-medium
                        file:bg-purple-600 file:text-white
                        hover:file:bg-purple-700
                        file:cursor-pointer cursor-pointer"
                      onChange={handleFileChange}
                    />
                    <p className="mt-1 text-xs text-gray-500">Upload your assignment (PDF, DOCX, PPT, etc.)</p>
                  </div>

                  {submission && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-white">Previous Submission</h3>
                      <p className="text-xs text-gray-400 mt-1">Submitted on: {formatDate(submission.submitted_at)}</p>

                      {submission.file_url && (
                        <p className="text-xs text-gray-400 mt-2">
                          Previous attachment:{" "}
                          <a
                            href={submission.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                          >
                            {submission.file_name || "Download"}
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? "Submitting..." : submission ? "Update Submission" : "Submit Assignment"}
                  </button>
                </div>
              </form>
            ) : submission ? (
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-medium text-white">Submitted</h3>
                  <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs">Submitted</span>
                </div>

                <p className="text-sm text-gray-400 mt-2">Submitted on: {formatDate(submission.submitted_at)}</p>

                {submission.submission_text && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400">Your submission:</p>
                    <p className="text-sm text-white mt-1 whitespace-pre-wrap">{submission.submission_text}</p>
                  </div>
                )}

                {submission.file_url && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400">Your attachment:</p>
                    <a
                      href={submission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      {submission.file_name || "Download"}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-900/30 p-4 rounded-lg">
                <p className="text-red-300">The deadline for this assignment has passed. You can no longer submit.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
