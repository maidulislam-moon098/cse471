"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  FileIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  FileImageIcon,
  FileIcon as FilePresentationIcon,
  FileArchiveIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileX2Icon,
  FileUp,
  Search,
  AlertCircle,
  Download,
  Trash2,
  Plus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Helper function to get appropriate icon based on file type
const getFileIcon = (fileType: string | null) => {
  if (!fileType) return <FileIcon className="h-6 w-6" />

  if (fileType.includes("pdf")) return <FileTextIcon className="h-6 w-6" />
  if (fileType.includes("word") || fileType.includes("doc")) return <FileTextIcon className="h-6 w-6" />
  if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv"))
    return <FileSpreadsheetIcon className="h-6 w-6" />
  if (fileType.includes("image")) return <FileImageIcon className="h-6 w-6" />
  if (fileType.includes("presentation") || fileType.includes("powerpoint"))
    return <FilePresentationIcon className="h-6 w-6" />
  if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("tar"))
    return <FileArchiveIcon className="h-6 w-6" />
  if (fileType.includes("video")) return <FileVideoIcon className="h-6 w-6" />
  if (fileType.includes("audio")) return <FileAudioIcon className="h-6 w-6" />

  return <FileIcon className="h-6 w-6" />
}

// Helper function to format file size
const formatFileSize = (bytes: number | null) => {
  if (bytes === null) return "Unknown size"

  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch user info and materials on component mount
  useEffect(() => {
    const fetchUserAndMaterials = async () => {
      try {
        setIsLoading(true)
        const supabase = getSupabaseBrowserClient()

        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError

        if (!userData.user) {
          throw new Error("Not authenticated")
        }

        setUserId(userData.user.id)

        // Get user role
        const { data: userRoleData, error: roleError } = await supabase
          .from("users")
          .select("role")
          .eq("id", userData.user.id)
          .single()

        if (roleError) throw roleError
        setUserRole(userRoleData.role)

        // Fetch courses based on user role
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
              (
                await supabase.from("teaching_assignments").select("course_id").eq("user_id", userData.user.id)
              ).data?.map((ta) => ta.course_id) || [],
            )
        } else {
          // Students can see courses they're enrolled in
          coursesQuery = supabase
            .from("courses")
            .select("*")
            .in(
              "id",
              (await supabase.from("enrollments").select("course_id").eq("user_id", userData.user.id)).data?.map(
                (e) => e.course_id,
              ) || [],
            )
        }

        const { data: coursesData, error: coursesError } = await coursesQuery
        if (coursesError) throw coursesError
        setCourses(coursesData || [])

        // Fetch materials
        await fetchMaterials(userRoleData.role, userData.user.id)
      } catch (err: any) {
        console.error("Error fetching user and materials:", err)
        setError(err.message || "Failed to load materials")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAndMaterials()
  }, [])

  // Fetch materials based on user role and filters
  const fetchMaterials = async (role: string, userId: string) => {
    try {
      const supabase = getSupabaseBrowserClient()

      let query = supabase.from("study_materials").select(`
          *,
          courses:course_id(id, code, title),
          uploader:uploaded_by(id, name)
        `)

      // Apply course filter if selected
      if (selectedCourse !== "all") {
        query = query.eq("course_id", selectedCourse)
      }

      // Apply search filter if provided
      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,file_name.ilike.%${searchQuery}%`,
        )
      }

      // For students, only show materials from courses they're enrolled in
      if (role === "student") {
        const { data: enrollments } = await supabase.from("enrollments").select("course_id").eq("user_id", userId)

        const enrolledCourseIds = enrollments?.map((e) => e.course_id) || []

        if (enrolledCourseIds.length > 0) {
          query = query.in("course_id", enrolledCourseIds)
        } else {
          // If not enrolled in any courses, return empty array
          setMaterials([])
          return
        }
      }

      // For faculty, only show materials from courses they teach or their own uploads
      if (role === "faculty") {
        const { data: teachingAssignments } = await supabase
          .from("teaching_assignments")
          .select("course_id")
          .eq("user_id", userId)

        const teachingCourseIds = teachingAssignments?.map((ta) => ta.course_id) || []

        if (teachingCourseIds.length > 0) {
          query = query.or(`course_id.in.(${teachingCourseIds.join(",")}),uploaded_by.eq.${userId}`)
        } else {
          // If not teaching any courses, only show own uploads
          query = query.eq("uploaded_by", userId)
        }
      }

      // Order by most recent first
      query = query.order("created_at", { ascending: false })

      const { data, error } = await query

      if (error) {
        if (error.message.includes("study_materials")) {
          throw new Error(
            "The study_materials table might not exist or has schema issues. Please run the fix-study-materials-table.sql script.",
          )
        } else {
          throw error
        }
      }

      setMaterials(data || [])
    } catch (err: any) {
      console.error("Error fetching materials:", err)
      setError(err.message || "Failed to load materials")
    }
  }

  // Handle course filter change
  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId)
    fetchMaterials(userRole || "", userId || "")
  }

  // Handle search
  const handleSearch = () => {
    fetchMaterials(userRole || "", userId || "")
  }

  // Handle material deletion
  const handleDeleteMaterial = async (materialId: string, filePath: string) => {
    try {
      const supabase = getSupabaseBrowserClient()

      // Delete the file from storage
      const { error: storageError } = await supabase.storage.from("materials").remove([filePath])

      if (storageError) {
        console.error("Error deleting file from storage:", storageError)
        // Continue with database deletion even if storage deletion fails
      }

      // Delete the material record from the database
      const { error: dbError } = await supabase.from("study_materials").delete().eq("id", materialId)

      if (dbError) throw dbError

      // Update the materials list
      setMaterials(materials.filter((material) => material.id !== materialId))

      toast({
        title: "Material deleted",
        description: "The material has been successfully deleted.",
        duration: 3000,
      })
    } catch (err: any) {
      console.error("Error deleting material:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to delete material",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Course Materials</h1>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Course Materials</h1>
        {(userRole === "admin" || userRole === "faculty") && (
          <Link href="/dashboard/materials/upload">
            <Button>
              <FileUp className="mr-2 h-4 w-4" />
              Upload Material
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/3">
          <Select value={selectedCourse} onValueChange={handleCourseChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-full md:w-2/3 gap-2">
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Materials</TabsTrigger>
          {userRole === "faculty" && <TabsTrigger value="uploaded">My Uploads</TabsTrigger>}
          <TabsTrigger value="recent">Recently Added</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {materials.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <FileX2Icon className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No materials found</h3>
              <p className="text-muted-foreground mt-2">
                {selectedCourse !== "all" || searchQuery
                  ? "Try changing your filters or search query"
                  : userRole === "faculty"
                    ? "Upload your first course material to get started"
                    : "No course materials have been uploaded yet"}
              </p>
              {(userRole === "admin" || userRole === "faculty") && (
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/materials/upload">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Material
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map((material) => (
                <Card key={material.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="mr-2">{getFileIcon(material.file_type)}</div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{material.title}</CardTitle>
                        <CardDescription className="line-clamp-1">
                          {material.courses?.code} - {material.courses?.title}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {material.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{material.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uploaded by {material.uploader?.name || "Unknown"}</span>
                      <span>{new Date(material.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {material.file_name.split(".").pop().toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(material.file_size)}
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-between">
                    <Button variant="outline" size="sm" asChild>
                      <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </a>
                    </Button>
                    {(userRole === "admin" || (userRole === "faculty" && material.uploaded_by === userId)) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteMaterial(material.id, material.file_path)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="uploaded">
          {userRole === "faculty" && (
            <>
              {materials.filter((m) => m.uploaded_by === userId).length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <FileX2Icon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">You haven't uploaded any materials yet</h3>
                  <p className="text-muted-foreground mt-2">
                    Upload your first course material to share with your students
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/materials/upload">
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Material
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {materials
                    .filter((m) => m.uploaded_by === userId)
                    .map((material) => (
                      <Card key={material.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="mr-2">{getFileIcon(material.file_type)}</div>
                            <div className="flex-1">
                              <CardTitle className="text-lg">{material.title}</CardTitle>
                              <CardDescription className="line-clamp-1">
                                {material.courses?.code} - {material.courses?.title}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {material.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{material.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Uploaded by you</span>
                            <span>{new Date(material.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {material.file_name.split(".").pop().toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {formatFileSize(material.file_size)}
                            </Badge>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2 flex justify-between">
                          <Button variant="outline" size="sm" asChild>
                            <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </a>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteMaterial(material.id, material.file_path)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="recent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 6)
              .map((material) => (
                <Card key={material.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="mr-2">{getFileIcon(material.file_type)}</div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{material.title}</CardTitle>
                        <CardDescription className="line-clamp-1">
                          {material.courses?.code} - {material.courses?.title}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {material.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{material.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uploaded by {material.uploader?.name || "Unknown"}</span>
                      <span>{new Date(material.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {material.file_name.split(".").pop().toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(material.file_size)}
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-between">
                    <Button variant="outline" size="sm" asChild>
                      <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </a>
                    </Button>
                    {(userRole === "admin" || (userRole === "faculty" && material.uploaded_by === userId)) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteMaterial(material.id, material.file_path)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
