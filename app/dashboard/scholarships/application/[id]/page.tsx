"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"

type ScholarshipApplication = {
  id: string
  scholarship_id: string
  user_id: string
  status: string
  gpa: number
  financial_info: string
  statement_of_purpose: string
  supporting_documents: { name: string; url: string }[]
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  scholarship: {
    id: string
    name: string
    description: string | null
    amount: number
    requirements: string | null
    deadline: string
    academic_year: string | null
  }
  reviewer?: {
    name: string
  }
}

export default function ViewApplicationPage() {
  const { user } = useAuth()
  const params = useParams()
  const applicationId = params.id as string
  const [application, setApplication] = useState<ScholarshipApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchApplication = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch application with scholarship details
        const { data, error } = await supabase
          .from("scholarship_applications")
          .select(`
            *,
            scholarship:scholarships(*),
            reviewer:users(name)
          `)
          .eq("id", applicationId)
          .single()

        if (error) throw error

        // Verify user has permission to view this application
        if (user.role !== "admin" && data.user_id !== user.id) {
          setError("You don't have permission to view this application")
          return
        }

        setApplication(data)
      } catch (error) {
        console.error("Error fetching application:", error)
        setError("Failed to load application details")
      } finally {
        setLoading(false)
      }
    }

    fetchApplication()
  }, [user, applicationId])

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
    if (!dateString) return "N/A"
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

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center mt-10">
        <p className="text-red-500">{error}</p>
        <Link href="/dashboard/scholarships">
          <Button className="mt-4">Back to Scholarships</Button>
        </Link>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="text-center mt-10">
        <p className="text-gray-400">Application not found.</p>
        <Link href="/dashboard/scholarships">
          <Button className="mt-4">Back to Scholarships</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/scholarships" className="text-gray-400 hover:text-white flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Scholarships
        </Link>
      </div>

      <Card className="bg-card border border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-white text-xl">Scholarship Application</CardTitle>
              <CardDescription className="text-gray-400">{application.scholarship.name}</CardDescription>
            </div>
            {getStatusBadge(application.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-medium mb-2">Scholarship Details</h3>
              <div className="bg-gray-800/50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <p className="text-gray-400 text-sm">Amount</p>
                    <p className="text-white">{formatCurrency(application.scholarship.amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Deadline</p>
                    <p className="text-white">{formatDate(application.scholarship.deadline)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Academic Year</p>
                  <p className="text-white">{application.scholarship.academic_year || "Current Academic Year"}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            <div>
              <h3 className="text-white font-medium mb-2">Application Status</h3>
              <div className="bg-gray-800/50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className="text-white capitalize">{application.status.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Applied On</p>
                    <p className="text-white">{formatDate(application.created_at)}</p>
                  </div>
                  {application.reviewed_at && (
                    <>
                      <div>
                        <p className="text-gray-400 text-sm">Reviewed By</p>
                        <p className="text-white">{application.reviewer?.name || "Administrator"}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Reviewed On</p>
                        <p className="text-white">{formatDate(application.reviewed_at)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            <div>
              <h3 className="text-white font-medium mb-2">Application Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">GPA</p>
                  <p className="text-white">{application.gpa}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Financial Information</p>
                  <p className="text-white whitespace-pre-line">{application.financial_info}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Statement of Purpose</p>
                  <p className="text-white whitespace-pre-line">{application.statement_of_purpose}</p>
                </div>
              </div>
            </div>

            {application.supporting_documents && application.supporting_documents.length > 0 && (
              <>
                <Separator className="bg-gray-700" />
                <div>
                  <h3 className="text-white font-medium mb-2">Supporting Documents</h3>
                  <div className="space-y-2">
                    {application.supporting_documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-md">
                        <span className="text-white">{doc.name}</span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 flex items-center"
                        >
                          View <ExternalLink className="ml-1 h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {application.admin_notes && user?.role === "admin" && (
              <>
                <Separator className="bg-gray-700" />
                <div>
                  <h3 className="text-white font-medium mb-2">Admin Notes</h3>
                  <p className="text-white whitespace-pre-line bg-gray-800/50 p-4 rounded-md">
                    {application.admin_notes}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
