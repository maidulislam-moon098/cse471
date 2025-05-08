"use client"

import type React from "react"

import { useState, useRef, type FormEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, FileUp, Loader2 } from "lucide-react"
import { uploadMaterial, checkMaterialsBucket } from "@/lib/storage-helper"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"

export default function UploadMaterialPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [courseId, setCourseId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bucketError, setBucketError] = useState<boolean>(false)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Check if the materials bucket exists
  useEffect(() => {
    const checkBucket = async () => {
      const exists = await checkMaterialsBucket()
      if (!exists) {
        setBucketError(true)
        setError(
          "The materials storage bucket does not exist. Please create it in the Supabase dashboard or contact an administrator.",
        )
      }
    }

    checkBucket()
  }, [])

  // Fetch courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const supabase = getSupabaseBrowserClient()

        // First, check if the user is faculty
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

  // Check if the study_materials table exists with the correct schema
  useEffect(() => {
    const checkStudyMaterialsTable = async () => {
      try {
        const supabase = getSupabaseBrowserClient()

        // Try to query the study_materials table with all expected columns
        const { data, error } = await supabase
          .from("study_materials")
          .select("id, title, file_name, file_path, file_url")
          .limit(1)

        if (error) {
          console.error("Error checking study_materials table:", error)
          setError(`Database schema issue: ${error.message}. Please run the fix-study-materials-table.sql script.`)
        }
      } catch (err: any) {
        console.error("Error checking study_materials table:", err)
      }
    }

    checkStudyMaterialsTable()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (bucketError) {
        throw new Error("Cannot upload files: Storage bucket not available")
      }

      if (!file) {
        throw new Error("Please select a file to upload")
      }

      if (!title.trim()) {
        throw new Error("Please enter a title for the material")
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

      // Generate a unique file path
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${courseId}/${fileName}`

      // Upload the file
      const fileUrl = await uploadMaterial(file, filePath)

      if (!fileUrl) {
        throw new Error("Failed to upload file")
      }

      // Save the material metadata to the database
      const { error: insertError } = await supabase.from("study_materials").insert({
        title,
        description,
        course_id: courseId,
        file_path: filePath,
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userId,
        created_at: new Date().toISOString(),
      })

      if (insertError) throw insertError

      setSuccess(true)

      // Reset form
      setTitle("")
      setDescription("")
      setCourseId("")
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/materials")
      }, 2000)
    } catch (err: any) {
      console.error("Error uploading material:", err)
      // Provide more detailed error message
      let errorMessage = "Failed to upload material"

      if (err.message) {
        errorMessage = err.message

        // Add more context for specific errors
        if (err.message.includes("column") && err.message.includes("does not exist")) {
          errorMessage += ". Database schema issue detected. Please run the fix-study-materials-table.sql script."
        } else if (err.message.includes("permission denied")) {
          errorMessage += ". You may not have permission to upload materials to this course."
        } else if (err.message.includes("storage")) {
          errorMessage += ". There was an issue with the storage bucket."
        }
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Upload Course Material</h1>
        <Link href="/dashboard/materials" className="text-purple-500 hover:text-purple-400">
          Back to Materials
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Material</CardTitle>
          <CardDescription>Share documents, presentations, or other resources with your students</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>

              {bucketError && (
                <div className="mt-2 text-sm">
                  <p className="font-semibold">Administrator Instructions:</p>
                  <ol className="list-decimal pl-5 space-y-1 mt-1">
                    <li>Go to your Supabase project dashboard</li>
                    <li>Navigate to "Storage" in the left sidebar</li>
                    <li>Click "Create bucket"</li>
                    <li>Enter "materials" as the bucket name</li>
                    <li>Check "Public bucket" if you want files to be publicly accessible</li>
                    <li>Click "Create bucket"</li>
                    <li>Set up appropriate access policies for the bucket</li>
                  </ol>
                </div>
              )}
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Material uploaded successfully! Redirecting to materials page...</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for this material"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a brief description of this material"
                rows={3}
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

            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file"
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="flex-1"
                  required
                />
              </div>
              {file && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || bucketError || !file || !title || !courseId}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Upload Material
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
