"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function AssignmentDebug() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diagnosticResults, setDiagnosticResults] = useState<any>({})
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const runDiagnostics = async () => {
      if (!user) {
        setError("User not authenticated")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const results: any = {
          user: {
            id: user.id,
            role: user.role,
            email: user.email,
          },
          tests: {},
        }

        // Test 1: Check if user can access the assignments table
        try {
          const { data: assignmentsAccess, error: assignmentsAccessError } = await supabase
            .from("assignments")
            .select("count(*)")
            .limit(1)

          results.tests.assignmentsTableAccess = {
            success: !assignmentsAccessError,
            error: assignmentsAccessError ? assignmentsAccessError.message : null,
            data: assignmentsAccess,
          }
        } catch (e: any) {
          results.tests.assignmentsTableAccess = {
            success: false,
            error: e.message,
          }
        }

        // Test 2: For faculty, check teaching assignments
        if (user.role === "faculty") {
          try {
            const { data: teachingAssignments, error: teachingError } = await supabase
              .from("teaching_assignments")
              .select("course_id")
              .eq("user_id", user.id)

            results.tests.teachingAssignments = {
              success: !teachingError,
              error: teachingError ? teachingError.message : null,
              data: teachingAssignments,
              count: teachingAssignments ? teachingAssignments.length : 0,
            }

            // If teaching assignments exist, check courses
            if (teachingAssignments && teachingAssignments.length > 0) {
              const courseIds = teachingAssignments.map((a) => a.course_id)

              const { data: courses, error: coursesError } = await supabase
                .from("courses")
                .select("*")
                .in("id", courseIds)

              results.tests.courses = {
                success: !coursesError,
                error: coursesError ? coursesError.message : null,
                data: courses,
                count: courses ? courses.length : 0,
              }

              // Check assignments for each course
              for (const courseId of courseIds) {
                const { data: assignments, error: assignmentsError } = await supabase
                  .from("assignments")
                  .select("*")
                  .eq("course_id", courseId)

                results.tests[`assignments_for_course_${courseId}`] = {
                  success: !assignmentsError,
                  error: assignmentsError ? assignmentsError.message : null,
                  data: assignments,
                  count: assignments ? assignments.length : 0,
                }
              }
            }
          } catch (e: any) {
            results.tests.teachingAssignments = {
              success: false,
              error: e.message,
            }
          }
        }

        // Test 3: For students, check enrollments
        if (user.role === "student") {
          try {
            const { data: enrollments, error: enrollmentsError } = await supabase
              .from("enrollments")
              .select("course_id")
              .eq("user_id", user.id)

            results.tests.enrollments = {
              success: !enrollmentsError,
              error: enrollmentsError ? enrollmentsError.message : null,
              data: enrollments,
              count: enrollments ? enrollments.length : 0,
            }

            // If enrollments exist, check courses
            if (enrollments && enrollments.length > 0) {
              const courseIds = enrollments.map((e) => e.course_id)

              const { data: courses, error: coursesError } = await supabase
                .from("courses")
                .select("*")
                .in("id", courseIds)

              results.tests.courses = {
                success: !coursesError,
                error: coursesError ? coursesError.message : null,
                data: courses,
                count: courses ? courses.length : 0,
              }

              // Check assignments for each course
              for (const courseId of courseIds) {
                const { data: assignments, error: assignmentsError } = await supabase
                  .from("assignments")
                  .select("*")
                  .eq("course_id", courseId)

                results.tests[`assignments_for_course_${courseId}`] = {
                  success: !assignmentsError,
                  error: assignmentsError ? assignmentsError.message : null,
                  data: assignments,
                  count: assignments ? assignments.length : 0,
                }
              }
            }
          } catch (e: any) {
            results.tests.enrollments = {
              success: false,
              error: e.message,
            }
          }
        }

        // Test 4: Try to create a test assignment (will be deleted immediately)
        if (user.role === "faculty") {
          try {
            // Get first course ID
            const courseId = results.tests.teachingAssignments?.data?.[0]?.course_id

            if (courseId) {
              const testAssignment = {
                course_id: courseId,
                title: "TEST ASSIGNMENT - WILL BE DELETED",
                description: "This is a test assignment created by the diagnostic tool",
                instructions: "This assignment will be deleted immediately",
                due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                max_points: 100,
                created_by: user.id,
              }

              const { data: createdAssignment, error: createError } = await supabase
                .from("assignments")
                .insert(testAssignment)
                .select()

              results.tests.createAssignment = {
                success: !createError,
                error: createError ? createError.message : null,
                data: createdAssignment,
              }

              // Delete the test assignment
              if (createdAssignment && createdAssignment.length > 0) {
                const { error: deleteError } = await supabase
                  .from("assignments")
                  .delete()
                  .eq("id", createdAssignment[0].id)

                results.tests.deleteAssignment = {
                  success: !deleteError,
                  error: deleteError ? deleteError.message : null,
                }
              }
            } else {
              results.tests.createAssignment = {
                success: false,
                error: "No courses available for testing",
              }
            }
          } catch (e: any) {
            results.tests.createAssignment = {
              success: false,
              error: e.message,
            }
          }
        }

        setDiagnosticResults(results)
      } catch (error: any) {
        setError(`Error running diagnostics: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    runDiagnostics()
  }, [user, supabase])

  const renderTestResult = (test: any, name: string) => {
    if (!test) return null

    return (
      <div className={`p-4 rounded-lg mb-4 ${test.success ? "bg-green-900" : "bg-red-900"}`}>
        <h3 className="text-lg font-medium mb-2">{name}</h3>
        <div className="flex items-center mb-2">
          <span
            className={`inline-block w-4 h-4 rounded-full mr-2 ${test.success ? "bg-green-500" : "bg-red-500"}`}
          ></span>
          <span>{test.success ? "Success" : "Failed"}</span>
        </div>
        {test.error && <p className="text-red-300 mb-2">Error: {test.error}</p>}
        {test.count !== undefined && <p className="mb-2">Count: {test.count}</p>}
        {test.data && (
          <div>
            <p className="mb-1 font-medium">Data:</p>
            <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(test.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Assignment System Diagnostics</h1>
      <p className="mt-1 text-gray-400">Troubleshooting tool for assignment functionality</p>

      {error && <div className="mt-4 p-3 bg-red-900 text-red-300 rounded">{error}</div>}

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="mt-6 bg-card p-6 rounded-lg border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div className="bg-gray-900 p-4 rounded-lg mb-6">
            <p>
              <span className="font-medium">User ID:</span> {diagnosticResults.user?.id}
            </p>
            <p>
              <span className="font-medium">Role:</span> {diagnosticResults.user?.role}
            </p>
            <p>
              <span className="font-medium">Email:</span> {diagnosticResults.user?.email}
            </p>
          </div>

          <h2 className="text-xl font-semibold mb-4">Test Results</h2>

          {renderTestResult(diagnosticResults.tests?.assignmentsTableAccess, "Assignments Table Access")}

          {user?.role === "faculty" && (
            <>
              {renderTestResult(diagnosticResults.tests?.teachingAssignments, "Teaching Assignments")}
              {renderTestResult(diagnosticResults.tests?.courses, "Courses")}
              {renderTestResult(diagnosticResults.tests?.createAssignment, "Create Assignment")}
              {renderTestResult(diagnosticResults.tests?.deleteAssignment, "Delete Assignment")}

              {/* Render course-specific assignment tests */}
              {Object.keys(diagnosticResults.tests || {})
                .filter((key) => key.startsWith("assignments_for_course_"))
                .map((key) => {
                  const courseId = key.replace("assignments_for_course_", "")
                  const courseName =
                    diagnosticResults.tests?.courses?.data?.find((c: any) => c.id === courseId)?.code || courseId
                  return renderTestResult(diagnosticResults.tests[key], `Assignments for ${courseName}`)
                })}
            </>
          )}

          {user?.role === "student" && (
            <>
              {renderTestResult(diagnosticResults.tests?.enrollments, "Enrollments")}
              {renderTestResult(diagnosticResults.tests?.courses, "Courses")}

              {/* Render course-specific assignment tests */}
              {Object.keys(diagnosticResults.tests || {})
                .filter((key) => key.startsWith("assignments_for_course_"))
                .map((key) => {
                  const courseId = key.replace("assignments_for_course_", "")
                  const courseName =
                    diagnosticResults.tests?.courses?.data?.find((c: any) => c.id === courseId)?.code || courseId
                  return renderTestResult(diagnosticResults.tests[key], `Assignments for ${courseName}`)
                })}
            </>
          )}

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Raw Diagnostic Data</h2>
            <pre className="bg-gray-900 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(diagnosticResults, null, 2)}
            </pre>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              className="btn-primary"
              onClick={() => {
                if (user?.role === "faculty") {
                  router.push("/dashboard/assignments/manage")
                } else {
                  router.push("/dashboard/assignments")
                }
              }}
            >
              Back to Assignments
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
