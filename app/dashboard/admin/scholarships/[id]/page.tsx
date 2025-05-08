"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Edit, CalendarIcon, Users } from "lucide-react"
import Link from "next/link"

type Scholarship = {
  id: string
  name: string
  description: string | null
  amount: number
  requirements: string | null
  deadline: string
  academic_year: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type ApplicationCount = {
  status: string
  count: number
}

export default function ScholarshipDetailsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const scholarshipId = params.id as string
  const [scholarship, setScholarship] = useState<Scholarship | null>(null)
  const [applicationCounts, setApplicationCounts] = useState<ApplicationCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchScholarship = async () => {
      if (!user || user.role !== "admin") {
        router.push("/dashboard")
        return
      }

      try {
        setLoading(true)

        // Fetch scholarship details
        const { data, error } = await supabase.from("scholarships").select("*").eq("id", scholarshipId).single()

        if (error) throw error
        setScholarship(data)

        // Fetch application counts by status
        const { data: countData, error: countError } = await supabase
          .rpc("get_application_counts_by_status", { scholarship_id_param: scholarshipId })
          .select("*")

        if (countError) {
          console.error("Error fetching application counts:", countError)
          // If the RPC function doesn't exist, fallback to a regular query
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("scholarship_applications")
            .select("status")
            .eq("scholarship_id", scholarshipId)

          if (fallbackError) throw fallbackError

          // Calculate counts manually
          const counts: Record<string, number> = {}
          fallbackData.forEach((app) => {
            counts[app.status] = (counts[app.status] || 0) + 1
          })

          const formattedCounts = Object.entries(counts).map(([status, count]) => ({
            status,
            count,
          }))

          setApplicationCounts(formattedCounts)
        } else {
          setApplicationCounts(countData || [])
        }
      } catch (error) {
        console.error("Error fetching scholarship:", error)
        setError("Failed to load scholarship details")
      } finally {
        setLoading(false)
      }
    }

    fetchScholarship()
  }, [user, scholarshipId, router])

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

  // Get total applications count
  const getTotalApplications = () => {
    return applicationCounts.reduce((total, item) => total + item.count, 0)
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500"
      case "under_review":
        return "bg-blue-500"
      case "approved":
        return "bg-green-500"
      case "rejected":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error || !scholarship) {
    return (
      <div className="text-center mt-10">
        <p className="text-red-500">{error || "Scholarship not found"}</p>
        <Link href="/dashboard/admin/scholarships">
          <Button className="mt-4">Back to Scholarships</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/admin/scholarships" className="text-gray-400 hover:text-white flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Scholarships
        </Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">{scholarship.name}</h1>
          <p className="mt-1 text-gray-400">{scholarship.academic_year || "Current Academic Year"}</p>
        </div>
        <div className="flex space-x-3">
          <Link href={`/dashboard/admin/scholarships/applications/${scholarshipId}`}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Users className="mr-2 h-4 w-4" />
              View Applications
            </Button>
          </Link>
          <Link href={`/dashboard/admin/scholarships/edit/${scholarshipId}`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-card border border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-white">{formatCurrency(scholarship.amount)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Deadline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-white flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDate(scholarship.deadline)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={scholarship.is_active ? "bg-green-500" : "bg-gray-500"}>
              {scholarship.is_active ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-card border border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 whitespace-pre-line">{scholarship.description || "No description provided."}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 whitespace-pre-line">
              {scholarship.requirements || "No specific requirements listed."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Applications Overview</CardTitle>
          <CardDescription className="text-gray-400">Total Applications: {getTotalApplications()}</CardDescription>
        </CardHeader>
        <CardContent>
          {applicationCounts.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {applicationCounts.map((item) => (
                  <div key={item.status} className="bg-gray-800 p-4 rounded-md">
                    <Badge className={getStatusBadgeColor(item.status)}>
                      {item.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    <p className="text-2xl font-semibold text-white mt-2">{item.count}</p>
                  </div>
                ))}
              </div>

              <Separator className="my-4 bg-gray-700" />

              <div className="flex justify-center">
                <Link href={`/dashboard/admin/scholarships/applications/${scholarshipId}`}>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Users className="mr-2 h-4 w-4" />
                    View All Applications
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No applications received yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
