"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, ThumbsUp, Plus, Loader2, Search } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function DiscussionsPage() {
  const [discussions, setDiscussions] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("discussions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussions",
        },
        (payload) => {
          // Refresh discussions when changes occur
          fetchUserRoleAndData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussion_comments",
        },
        (payload) => {
          // Refresh discussions when comments change
          fetchUserRoleAndData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussion_upvotes",
        },
        (payload) => {
          // Refresh discussions when upvotes change
          fetchUserRoleAndData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const fetchUserRoleAndData = async () => {
    try {
      setIsLoading(true)

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError

      const currentUserId = userData.user?.id

      if (!currentUserId) {
        throw new Error("User not authenticated")
      }

      setUserId(currentUserId)

      // Get user role
      const { data: userRoleData, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", currentUserId)
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
            (await supabase.from("teaching_assignments").select("course_id").eq("user_id", currentUserId)).data?.map(
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
            (await supabase.from("enrollments").select("course_id").eq("user_id", currentUserId)).data?.map(
              (e) => e.course_id,
            ) || [],
          )
      }

      const { data: coursesData, error: coursesError } = await coursesQuery

      if (coursesError) throw coursesError

      setCourses(coursesData || [])

      // Fetch discussions
      await fetchDiscussions(currentUserId, userRoleData.role, selectedCourse, activeTab)
    } catch (err: any) {
      console.error("Error fetching user data:", err)
      setError(err.message || "Failed to load discussions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserRoleAndData()
  }, [])

  const fetchDiscussions = async (userId: string, role: string, courseFilter: string, tabFilter: string) => {
    try {
      // Build the query based on user role and course filter
      let query = supabase
        .from("discussions")
        .select(`
          *,
          courses!discussions_course_id_fkey (id, title, code),
          users!discussions_created_by_fkey (id, name, email),
          discussion_comments (id),
          discussion_upvotes (id, user_id)
        `)
        .order("created_at", { ascending: false })

      // Apply course filter if not "all"
      if (courseFilter !== "all") {
        query = query.eq("course_id", courseFilter)
      }

      // Apply role-based filters
      if (role !== "admin") {
        // For faculty and students, only show discussions for their courses
        const { data: userCoursesData, error: userCoursesError } = await supabase
          .from(role === "faculty" ? "teaching_assignments" : "enrollments")
          .select("course_id")
          .eq("user_id", userId)

        if (userCoursesError) throw userCoursesError

        const userCourseIds = userCoursesData?.map((c) => c.course_id) || []

        if (userCourseIds.length === 0) {
          // No courses, so no discussions
          setDiscussions([])
          return
        }

        query = query.in("course_id", userCourseIds)
      }

      // Apply tab filter
      if (tabFilter === "my-discussions") {
        query = query.eq("created_by", userId)
      } else if (tabFilter === "popular") {
        // We'll sort by upvotes count after fetching
      } else if (tabFilter === "recent") {
        query = query.order("created_at", { ascending: false })
      } else if (tabFilter === "unanswered") {
        query = query.eq("discussion_comments.count", 0)
      }

      const { data, error } = await query

      if (error) throw error

      let filteredData = data || []

      // Apply search filter if provided
      if (searchQuery) {
        const lowerSearchQuery = searchQuery.toLowerCase()
        filteredData = filteredData.filter(
          (discussion) =>
            discussion.title.toLowerCase().includes(lowerSearchQuery) ||
            discussion.content.toLowerCase().includes(lowerSearchQuery),
        )
      }

      // Sort by popularity if needed
      if (tabFilter === "popular") {
        filteredData.sort((a, b) => (b.discussion_upvotes?.length || 0) - (a.discussion_upvotes?.length || 0))
      }

      // Process the data to add additional fields
      const processedData = filteredData.map((discussion) => {
        const hasUserUpvoted = discussion.discussion_upvotes?.some((upvote) => upvote.user_id === userId) || false
        return {
          ...discussion,
          hasUserUpvoted,
          upvoteCount: discussion.discussion_upvotes?.length || 0,
          commentCount: discussion.discussion_comments?.length || 0,
        }
      })

      setDiscussions(processedData)
    } catch (err: any) {
      console.error("Error fetching discussions:", err)
      setError(err.message || "Failed to load discussions")
    }
  }

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourse(courseId)
    setIsLoading(true)

    try {
      if (!userId || !userRole) {
        throw new Error("User not authenticated")
      }

      await fetchDiscussions(userId, userRole, courseId, activeTab)
    } catch (err: any) {
      console.error("Error filtering discussions:", err)
      setError(err.message || "Failed to filter discussions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = async (tab: string) => {
    setActiveTab(tab)
    setIsLoading(true)

    try {
      if (!userId || !userRole) {
        throw new Error("User not authenticated")
      }

      await fetchDiscussions(userId, userRole, selectedCourse, tab)
    } catch (err: any) {
      console.error("Error filtering discussions:", err)
      setError(err.message || "Failed to filter discussions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!userId || !userRole) {
        throw new Error("User not authenticated")
      }

      await fetchDiscussions(userId, userRole, selectedCourse, activeTab)
    } catch (err: any) {
      console.error("Error searching discussions:", err)
      setError(err.message || "Failed to search discussions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpvote = async (discussionId: string, currentlyUpvoted: boolean) => {
    if (!userId) return

    try {
      if (currentlyUpvoted) {
        // Remove upvote
        await supabase.from("discussion_upvotes").delete().eq("discussion_id", discussionId).eq("user_id", userId)
      } else {
        // Add upvote
        await supabase.from("discussion_upvotes").insert({
          discussion_id: discussionId,
          user_id: userId,
          created_at: new Date().toISOString(),
        })
      }

      // Update local state immediately for better UX
      setDiscussions(
        discussions.map((discussion) => {
          if (discussion.id === discussionId) {
            return {
              ...discussion,
              hasUserUpvoted: !currentlyUpvoted,
              upvoteCount: currentlyUpvoted ? discussion.upvoteCount - 1 : discussion.upvoteCount + 1,
            }
          }
          return discussion
        }),
      )
    } catch (error) {
      console.error("Error updating upvote:", error)
    }
  }

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discussion Forums</h1>
          <p className="text-muted-foreground">Engage in course discussions with your peers and instructors</p>
        </div>
        <Button onClick={() => router.push("/dashboard/discussions/create")}>
          <Plus className="mr-2 h-4 w-4" />
          New Discussion
        </Button>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="font-medium">Filter by course:</div>
            <Select value={selectedCourse} onValueChange={handleCourseChange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a course" />
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

          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <div className="relative w-full md:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search discussions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" className="ml-2">
              Search
            </Button>
          </form>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            <TabsTrigger value="all">All Discussions</TabsTrigger>
            <TabsTrigger value="my-discussions">My Discussions</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="unanswered" className="hidden lg:block">
              Unanswered
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No discussions found</h3>
          <p className="mt-2 text-muted-foreground">
            {selectedCourse === "all"
              ? "There are no discussions in any of your courses yet."
              : "There are no discussions in this course yet."}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/discussions/create")}>
            Start a new discussion
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {discussions.map((discussion) => (
            <Card key={discussion.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                <div className="p-4 md:p-6 flex flex-col items-center justify-center border-r border-border bg-muted/10 w-full md:w-24">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center p-2"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleUpvote(discussion.id, discussion.hasUserUpvoted)
                    }}
                  >
                    <ThumbsUp
                      className={`h-5 w-5 ${discussion.hasUserUpvoted ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                    <span className="mt-1 text-sm font-medium">{discussion.upvoteCount}</span>
                  </Button>
                  <div className="mt-2 flex items-center">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mr-1" />
                    <span className="text-sm">{discussion.commentCount}</span>
                  </div>
                </div>

                <Link href={`/dashboard/discussions/${discussion.id}`} className="flex-1">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold hover:text-primary transition-colors">{discussion.title}</h3>
                      <Badge variant="outline" className="ml-2">
                        {discussion.courses?.code}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground line-clamp-2 mb-4">{discussion.content}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(discussion.users?.name || "User")}`}
                          />
                          <AvatarFallback>{getUserInitials(discussion.users?.name || "User")}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          {discussion.users?.name || "Unknown user"} •{" "}
                          {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {discussion.commentCount === 0 && <Badge variant="secondary">No replies yet</Badge>}
                    </div>
                  </div>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
