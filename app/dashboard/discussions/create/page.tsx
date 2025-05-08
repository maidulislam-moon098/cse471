"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2, MessageSquarePlus, ArrowLeft } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"

export default function CreateDiscussionPage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [courseId, setCourseId] = useState("")
  const [courses, setCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // Fetch courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const supabase = getSupabaseBrowserClient()

        // First, check if the user is authenticated
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError) throw userError

        const userId = userData.user?.id

        if (!userId) {
          throw new Error("User not authenticated")
        }

        // Get courses based on user role
        const { data: userRoleData, error: roleError } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .single()

        if (roleError) throw roleError

        let coursesQuery

        if (userRoleData.role === "admin") {
          // Admin can see all courses
          coursesQuery = supabase.from("courses").select("*")
        } else if (userRoleData.role === "faculty") {
          // Faculty can see courses they teach
          coursesQuery = supabase
            .from("courses")
            .select("*")
            .in(
              "id",
              (await supabase.from("teaching_assignments").select("course_id").eq("user_id", userId)).data?.map(
                (ta) => ta.course_id,
              ) || [],
            )
        } else {
          // Students can see courses they're enrolled in
          coursesQuery = supabase
            .from("courses")
            .select("*")
            .in(
              "id",
              (await supabase.from("enrollments").select("course_id").eq("user_id", userId)).data?.map(
                (e) => e.course_id,
              ) || [],
            )
        }

        const { data: coursesData, error: coursesError } = await coursesQuery

        if (coursesError) throw coursesError

        setCourses(coursesData || [])
        if (coursesData && coursesData.length > 0) {
          setCourseId(coursesData[0].id)
        }
      } catch (err: any) {
        console.error("Error fetching courses:", err)
        setError("Failed to load courses: " + (err.message || "Unknown error"))
      } finally {
        setIsLoadingCourses(false)
      }
    }

    fetchCourses()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!title.trim()) {
        throw new Error("Please enter a title for the discussion")
      }

      if (!content.trim()) {
        throw new Error("Please enter content for the discussion")
      }

      if (!courseId) {
        throw new Error("Please select a course")
      }

      const supabase = getSupabaseBrowserClient()

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError

      const userId = userData.user?.id

      if (!userId) {
        throw new Error("User not authenticated")
      }

      // Create the discussion
      const { data: discussionData, error: discussionError } = await supabase
        .from("discussions")
        .insert({
          title,
          content,
          course_id: courseId,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_pinned: false,
          is_closed: false,
          view_count: 0,
        })
        .select()

      if (discussionError) throw discussionError

      setSuccess(true)

      // Reset form
      setTitle("")
      setContent("")

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/discussions")
      }, 2000)
    } catch (err: any) {
      console.error("Error creating discussion:", err)
      setError(err.message || "Failed to create discussion")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Start a Discussion</h1>
        <Link href="/dashboard/discussions" className="flex items-center text-primary hover:text-primary/80">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Discussions
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Discussion</CardTitle>
          <CardDescription>Start a new discussion topic for your course</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Discussion created successfully! Redirecting to discussions page...</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your discussion"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your discussion content here..."
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              {isLoadingCourses ? (
                <div className="flex items-center space-x-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading courses...</span>
                </div>
              ) : (
                <Select value={courseId} onValueChange={setCourseId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length > 0 ? (
                      courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-courses" disabled>
                        No courses available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !title || !content || !courseId}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Create Discussion
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
