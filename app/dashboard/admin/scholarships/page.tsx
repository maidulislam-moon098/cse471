"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusIcon, Search, CalendarIcon, Edit, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"

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

type ScholarshipApplication = {
  id: string
  scholarship_id: string
  user_id: string
  status: string
  created_at: string
  updated_at: string
  scholarship: {
    name: string
  }
  user: {
    name: string
    email: string
  }
}

export default function AdminScholarshipsPage() {
  const { user } = useAuth()
  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [applications, setApplications] = useState<ScholarshipApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "admin") return

      try {
        setLoading(true)

        // Fetch all scholarships
        const { data: scholarshipsData, error: scholarshipsError } = await supabase
          .from("scholarships")
          .select("*")
          .order("created_at", { ascending: false })

        if (scholarshipsError) throw scholarshipsError
        if (scholarshipsData) setScholarships(scholarshipsData)

        // Fetch all applications with scholarship and user details
        const { data: applicationsData, error: applicationsError } = await supabase
          .from("scholarship_applications")
          .select(`
            *,
            scholarship:scholarships(name),
            user:users(name, email)
          `)
          .order("created_at", { ascending: false })

        if (applicationsError) throw applicationsError
        if (applicationsData) setApplications(applicationsData)
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

  // Filter scholarships based on search term
  const filteredScholarships = scholarships.filter(
    (scholarship) =>
      scholarship.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scholarship.academic_year?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Filter applications based on search term
  const filteredApplications = applications.filter(
    (application) =>
      application.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.scholarship.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
          <h1 className="text-2xl font-semibold text-white">Manage Scholarships</h1>
          <p className="mt-1 text-gray-400">Create and manage scholarship programs and review applications</p>
        </div>
        <Link href="/dashboard/admin/scholarships/create">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Scholarship
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search scholarships or applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      <Tabs defaultValue="scholarships" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="scholarships" className="data-[state=active]:bg-gray-700">
            Scholarships
          </TabsTrigger>
          <TabsTrigger value="applications" className="data-[state=active]:bg-gray-700">
            Applications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scholarships" className="mt-6">
          {filteredScholarships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredScholarships.map((scholarship) => (
                <Card key={scholarship.id} className="bg-card border border-gray-800">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-white">
                      {scholarship.name}
                      {!scholarship.is_active && (
                        <Badge className="ml-2 bg-gray-600" variant="outline">
                          Inactive
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/admin/scholarships/${scholarship.id}`}>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">View details</span>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/admin/scholarships/edit/${scholarship.id}`}>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Edit</span>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-400 mb-2">
                      {scholarship.academic_year || "Current Academic Year"}
                    </div>
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
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
              <p className="text-gray-400">No scholarships found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          {filteredApplications.length > 0 ? (
            <div className="overflow-x-auto bg-card rounded-lg border border-gray-800">
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
                      Scholarship
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{application.scholarship.name}</div>
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
            <div className="bg-card p-6 rounded-lg border border-gray-800 text-center">
              <p className="text-gray-400">No applications found.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
