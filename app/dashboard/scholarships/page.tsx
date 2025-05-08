"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, ArrowRightIcon, PlusIcon } from "lucide-react"

type Scholarship = {
  id: string
  name: string
  description: string | null
  amount: number
  requirements: string | null
  deadline: string
  academic_year: string | null
  is_active: boolean
}

type ScholarshipApplication = {
  id: string
  scholarship_id: string
  user_id: string
  status: string
  created_at: string
  scholarship: Scholarship
}

export default function ScholarshipsPage() {
  const { user } = useAuth()
  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [applications, setApplications] = useState<ScholarshipApplication[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch active scholarships
        const { data: scholarshipsData, error: scholarshipsError } = await supabase
          .from("scholarships")
          .select("*")
          .eq("is_active", true)
          .order("deadline", { ascending: true })

        if (scholarshipsError) throw scholarshipsError
        if (scholarshipsData) setScholarships(scholarshipsData)

        // For students, fetch their applications with scholarship details
        if (user.role === "student") {
          const { data: applicationsData, error: applicationsError } = await supabase
            .from("scholarship_applications")
            .select(`
              *,
              scholarship:scholarships(*)
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

          if (applicationsError) throw applicationsError
          if (applicationsData) setApplications(applicationsData)
        }
      } catch (error) {
        console.error("Error fetching scholarships data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      case "under_review":
        return <Badge className="bg-blue-500">Under Review</Badge>
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Check if user has already applied for a scholarship
  const hasApplied = (scholarshipId: string) => {
    return applications.some((app) => app.scholarship_id === scholarshipId)
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Scholarships</h1>
          <p className="mt-1 text-gray-400">
            {user?.role === "student"
              ? "View available scholarships and your applications"
              : "Manage scholarship programs and applications"}
          </p>
        </div>
        {user?.role === "admin" && (
          <Link href="/dashboard/scholarships/create">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Scholarship
            </Button>
          </Link>
        )}
      </div>

      {user?.role === "student" && applications.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-white mb-4">Your Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {applications.map((application) => (
              <Card key={application.id} className="bg-card border border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-white">{application.scholarship.name}</CardTitle>
                    {getStatusBadge(application.status)}
                  </div>
                  <CardDescription className="text-gray-400">
                    Applied on {formatDate(application.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-2">
                    <span className="font-medium">Amount:</span> {formatCurrency(application.scholarship.amount)}
                  </p>
                  <p className="text-gray-300 mb-2">
                    <span className="font-medium">Deadline:</span> {formatDate(application.scholarship.deadline)}
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href={`/dashboard/scholarships/application/${application.id}`}>
                    <Button variant="outline" className="w-full">
                      View Application
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium text-white mb-4">Available Scholarships</h2>
        {scholarships.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scholarships.map((scholarship) => (
              <Card key={scholarship.id} className="bg-card border border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">{scholarship.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {scholarship.academic_year || "Current Academic Year"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">{scholarship.description}</p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white font-semibold">{formatCurrency(scholarship.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Deadline:</span>
                    <span className="text-white flex items-center">
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      {formatDate(scholarship.deadline)}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  {user?.role === "student" ? (
                    hasApplied(scholarship.id) ? (
                      <Button disabled className="w-full bg-gray-700">
                        Already Applied
                      </Button>
                    ) : (
                      <Link href={`/dashboard/scholarships/apply/${scholarship.id}`} className="w-full">
                        <Button className="w-full bg-purple-600 hover:bg-purple-700">Apply Now</Button>
                      </Link>
                    )
                  ) : (
                    <Link href={`/dashboard/scholarships/${scholarship.id}`} className="w-full">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
            <p className="text-gray-400">No scholarships are currently available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
