"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Filter, Eye } from "lucide-react"
import Link from "next/link"

type ScholarshipApplication = {
  id: string
  scholarship_id: string
  user_id: string
  status: string
  gpa: number
  created_at: string
  updated_at: string
  user: {
    name: string
    email: string
    department: string | null
  }
}

type Scholarship = {
  id: string
  name: string
}

export default function ScholarshipApplicationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const scholarshipId = params.id as string
  const [scholarship, setScholarship] = useState<Scholarship | null>(null)
  const [applications, setApplications] = useState<ScholarshipApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user || user.role !== "admin") {
        router.push("/dashboard")
        return
      }

      try {
        setLoading(true)

        // Fetch scholarship details
        const { data: scholarshipData, error: scholarshipError } = await supabase
          .from("scholarships")
          .select("id, name")
          .eq("id", scholarshipId)
          .single()

        if (scholarshipError) throw scholarshipError
        setScholarship(scholarshipData)

        // Fetch applications with user details
        const { data: applicationsData, error: applicationsError } = await supabase
          .from("scholarship_applications")
          .select(`
            *,
            user:users(name, email, department)
          `)
          .eq("scholarship_id", scholarshipId)
          .order("created_at", { ascending: false })

        if (applicationsError) throw applicationsError
        setApplications(applicationsData || [])
      } catch (error) {
        console.error("Error fetching applications:", error)
        setError("Failed to load applications")
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [user, scholarshipId, router])

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Get status badge
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

  // Filter applications based on search term and status
  const filteredApplications = applications.filter((application) => {
    const matchesSearch =
      application.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (application.user.department && application.user.department.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || application.status === statusFilter

    return matchesSearch && matchesStatus
  })

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
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/dashboard/admin/scholarships/${scholarshipId}`}
          className="text-gray-400 hover:text-white flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Scholarship Details
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Applications for {scholarship.name}</h1>
          <p className="mt-1 text-gray-400">Review and manage student applications</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by student name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Applications</CardTitle>
          <CardDescription className="text-gray-400">
            Total: {filteredApplications.length}{" "}
            {filteredApplications.length !== applications.length && `(filtered from ${applications.length})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredApplications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Student
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      GPA
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Date Applied
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{application.user.name}</div>
                        <div className="text-sm text-gray-400">{application.user.email}</div>
                        {application.user.department && (
                          <div className="text-xs text-gray-500">{application.user.department}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{application.gpa}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>{getStatusBadge(application.status)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{formatDate(application.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <Link href={`/dashboard/admin/scholarships/application/${application.id}`}>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                            <Eye className="mr-2 h-4 w-4" />
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No applications found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
