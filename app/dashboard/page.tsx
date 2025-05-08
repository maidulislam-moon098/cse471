"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Course = Database["public"]["Tables"]["courses"]["Row"]
type Announcement = Database["public"]["Tables"]["announcements"]["Row"]
type Deadline = Database["public"]["Tables"]["deadlines"]["Row"]

export default function Dashboard() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch courses based on user role
        if (user.role === "student") {
          // Fetch enrolled courses for students
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("user_id", user.id)

          if (enrollmentsError) throw enrollmentsError

          if (enrollments && enrollments.length > 0) {
            const courseIds = enrollments.map((e) => e.course_id)

            const { data: coursesData, error: coursesError } = await supabase
              .from("courses")
              .select("*")
              .in("id", courseIds)

            if (coursesError) throw coursesError
            if (coursesData) setCourses(coursesData)

            // Fetch announcements for these courses
            const { data: announcementsData, error: announcementsError } = await supabase
              .from("announcements")
              .select("*")
              .in("course_id", courseIds)
              .order("created_at", { ascending: false })
              .limit(5)

            if (announcementsError) throw announcementsError
            if (announcementsData) setAnnouncements(announcementsData)

            // Fetch deadlines for these courses
            const { data: deadlinesData, error: deadlinesError } = await supabase
              .from("deadlines")
              .select("*")
              .in("course_id", courseIds)
              .order("due_date", { ascending: true })
              .limit(5)

            if (deadlinesError) throw deadlinesError
            if (deadlinesData) setDeadlines(deadlinesData)
          }
        } else {
          // Fetch teaching assignments for faculty
          const { data: assignments, error: assignmentsError } = await supabase
            .from("teaching_assignments")
            .select("course_id")
            .eq("user_id", user.id)

          if (assignmentsError) throw assignmentsError

          if (assignments && assignments.length > 0) {
            const courseIds = assignments.map((a) => a.course_id)

            const { data: coursesData, error: coursesError } = await supabase
              .from("courses")
              .select("*")
              .in("id", courseIds)

            if (coursesError) throw coursesError
            if (coursesData) setCourses(coursesData)

            // Fetch announcements for these courses
            const { data: announcementsData, error: announcementsError } = await supabase
              .from("announcements")
              .select("*")
              .in("course_id", courseIds)
              .order("created_at", { ascending: false })
              .limit(5)

            if (announcementsError) throw announcementsError
            if (announcementsData) setAnnouncements(announcementsData)

            // Fetch deadlines for these courses
            const { data: deadlinesData, error: deadlinesError } = await supabase
              .from("deadlines")
              .select("*")
              .in("course_id", courseIds)
              .order("due_date", { ascending: true })
              .limit(5)

            if (deadlinesError) throw deadlinesError
            if (deadlinesData) setDeadlines(deadlinesData)
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // If no data is available yet, show mock data
  useEffect(() => {
    if (!loading && courses.length === 0) {
      // Set mock data if no real data is available
      if (user?.role === "student") {
        setCourses([
          {
            id: "1",
            code: "CSE471",
            title: "System Analysis and Design",
            description: "Introduction to system analysis and design concepts",
            credits: 3,
            room: "Room 301",
            schedule: "Mon, Wed 10:00 AM - 11:30 AM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            code: "CSE331",
            title: "Data Structures",
            description: "Advanced data structures and algorithms",
            credits: 3,
            room: "Room 205",
            schedule: "Tue, Thu 1:00 PM - 2:30 PM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "3",
            code: "CSE482",
            title: "Internet and Web Technology",
            description: "Web development and internet technologies",
            credits: 3,
            room: "Lab 102",
            schedule: "Wed, Fri 3:00 PM - 4:30 PM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

        setAnnouncements([
          {
            id: "1",
            course_id: "1",
            title: "Project submission deadline extended",
            content: "The deadline has been extended by one week",
            created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            updated_at: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: "2",
            course_id: "2",
            title: "Quiz postponed to next week",
            content: "Due to the holiday, the quiz will be postponed",
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            updated_at: new Date(Date.now() - 86400000).toISOString(),
          },
        ])

        setDeadlines([
          {
            id: "1",
            course_id: "1",
            title: "Project Proposal",
            description: "Submit your project proposal",
            due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            course_id: "2",
            title: "Assignment 3",
            description: "Complete the assignment on sorting algorithms",
            due_date: new Date(Date.now() + 432000000).toISOString(), // 5 days later
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
      } else {
        setCourses([
          {
            id: "1",
            code: "CSE471",
            title: "System Analysis and Design",
            description: "Introduction to system analysis and design concepts",
            credits: 3,
            room: "Room 301",
            schedule: "Mon, Wed 10:00 AM - 11:30 AM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            code: "CSE311",
            title: "Database Systems",
            description: "Database design and implementation",
            credits: 3,
            room: "Room 205",
            schedule: "Tue, Thu 9:00 AM - 10:30 AM",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

        setAnnouncements([
          {
            id: "1",
            course_id: "1",
            title: "New course materials uploaded",
            content: "Check the course materials section for new readings",
            created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
            updated_at: new Date(Date.now() - 10800000).toISOString(),
          },
          {
            id: "2",
            course_id: "2",
            title: "Grading completed for Quiz 2",
            content: "Grades have been posted",
            created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            updated_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ])

        setDeadlines([
          {
            id: "1",
            course_id: "1",
            title: "Grade Project Proposals",
            description: "Review and grade student project proposals",
            due_date: new Date(Date.now() + 345600000).toISOString(), // 4 days later
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            course_id: "2",
            title: "Prepare Midterm Questions",
            description: "Finalize the midterm exam questions",
            due_date: new Date(Date.now() + 604800000).toISOString(), // 7 days later
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
      }
    }
  }, [loading, courses.length, user])

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 24) {
      return diffHours === 0 ? "Just now" : `${diffHours} hours ago`
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`
    }
  }

  // Format due date for display
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === now.toDateString()) {
      return "Today, " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow, " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else {
      return (
        date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }) +
        ", " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      )
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
      <p className="mt-1 text-gray-400">Welcome back, {user?.name}!</p>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Announcements */}
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h2 className="text-lg font-medium text-white mb-4">Recent Announcements</h2>
              {announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border-l-4 border-purple-600 pl-4">
                      <p className="text-sm text-gray-400">
                        {courses.find((c) => c.id === announcement.course_id)?.code || "Unknown Course"}
                      </p>
                      <p className="text-white">{announcement.title}</p>
                      <p className="text-sm text-gray-400">{formatDate(announcement.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No recent announcements.</p>
              )}
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-card p-6 rounded-lg border border-gray-800">
              <h2 className="text-lg font-medium text-white mb-4">Upcoming Deadlines</h2>
              {deadlines.length > 0 ? (
                <div className="space-y-4">
                  {deadlines.map((deadline) => (
                    <div key={deadline.id} className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-400">
                          {courses.find((c) => c.id === deadline.course_id)?.code || "Unknown Course"}
                        </p>
                        <p className="text-white">{deadline.title}</p>
                      </div>
                      <div className="bg-gray-800 px-3 py-1 rounded-full text-sm text-white">
                        {formatDueDate(deadline.due_date)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No upcoming deadlines.</p>
              )}
            </div>
          </div>

          {/* Enrolled Courses */}
          <div className="mt-6">
            <h2 className="text-lg font-medium text-white mb-4">
              {user?.role === "student" ? "Enrolled Courses" : "Courses Teaching"}
            </h2>
            {courses.length > 0 ? (
              <div className="overflow-x-auto bg-card rounded-lg border border-gray-800">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Course
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Schedule
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Room
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                      >
                        Credits
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{course.code}</div>
                          <div className="text-sm text-gray-400">{course.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{course.schedule}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{course.room}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{course.credits}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400">
                {user?.role === "student"
                  ? "You are not enrolled in any courses yet."
                  : "You are not teaching any courses yet."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
