"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, ExternalLink, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  user: {
    name: string
    email: string
    department: string | null
  }
}

export default function ReviewApplicationPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const applicationId = params.id as string
  const [application, setApplication] = useState<ScholarshipApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = getSupabaseBrowserClient()

  // Form state
  const [status, setStatus] = useState<string>("pending")
  const [adminNotes, setAdminNotes] = useState<string>("")

  useEffect(() => {
    const fetchApplication = async () => {
      if (!user || user.role !== "admin") {
        router.push("/dashboard")
        return
      }

      try {
        setLoading(true)

        // Fetch application with scholarship and user details
        const { data, error } = await supabase
          .from("scholarship_applications")
          .select(`
            *,
            scholarship:scholarships(*),
            user:users(name, email, department)
          `)
          .eq("id", applicationId)
          .single()

        if (error) throw error

        setApplication(data)
        setStatus(data.status)
        setAdminNotes(data.admin_notes || "")
      } catch (error) {
        console.error("Error fetching application:", error)
        setError("Failed to load application details")
      } finally {
        setLoading(false)
      }
    }

    fetchApplication()
  }, [user, applicationId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !application) return

    try {
      setSubmitting(true)
      setError(null)

      // Update application
      const { error } = await supabase
        .from("scholarship_applications")
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard/admin/scholarships")
      }, 2000)
    } catch (error) {
      console.error("Error updating application:", error)
      setError("Failed to update application. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

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

  if (error && !application) {
    return (
      <div className="text-center mt-10">
        <p className="text-red-500">{error}</p>
        <Link href="/dashboard/admin/scholarships">
          <Button className="mt-4">Back to Scholarships</Button>
        </Link>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="text-center mt-10">
        <p className="text-gray-400">Application not found.</p>
        <Link href="/dashboard/admin/scholarships">
          <Button className="mt-4">Back to Scholarships</Button>
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <Alert className="bg-green-900/20 border-green-500">
          <AlertCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-500">Application Updated</AlertTitle>
          <AlertDescription className="text-gray-300">
            The scholarship application has been updated successfully. You will be redirected to the scholarships page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/admin/scholarships" className="text-gray-400 hover:text-white flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Scholarships
        </Link>
      </div>

      <Card className="bg-card border border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-white text-xl">Review Scholarship Application</CardTitle>
              <CardDescription className="text-gray-400">{application.scholarship.name}</CardDescription>
            </div>
            {getStatusBadge(application.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-medium mb-2">Student Information</h3>
              <div className="bg-gray-800/50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Name</p>
                    <p className="text-white">{application.user.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-white">{application.user.email}</p>
                  </div>
                  {application.user.department && (
                    <div>
                      <p className="text-gray-400 text-sm">Department</p>
                      <p className="text-white">{application.user.department}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 text-sm">GPA</p>
                    <p className="text-white">{application.gpa}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-700" />

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
                  <p className="text-gray-400 text-sm">Requirements</p>
                  <p className="text-white">
                    {application.scholarship.requirements || "No specific requirements listed."}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            <div>
              <h3 className="text-white font-medium mb-2">Application Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Financial Information</p>
                  <p className="text-white whitespace-pre-line bg-gray-800/50 p-4 rounded-md">
                    {application.financial_info}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Statement of Purpose</p>
                  <p className="text-white whitespace-pre-line bg-gray-800/50 p-4 rounded-md">
                    {application.statement_of_purpose}
                  </p>
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

            <Separator className="bg-gray-700" />

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label className="text-white mb-2 block">Update Application Status</Label>
                  <RadioGroup value={status} onValueChange={setStatus} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pending" id="pending" />
                      <Label htmlFor="pending" className="text-white">
                        Pending
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="under_review" id="under_review" />
                      <Label htmlFor="under_review" className="text-white">
                        Under Review
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="approved" id="approved" />
                      <Label htmlFor="approved" className="text-white">
                        Approved
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="rejected" id="rejected" />
                      <Label htmlFor="rejected" className="text-white">
                        Rejected
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="adminNotes" className="text-white">
                    Admin Notes
                  </Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Add notes about this application (visible to admins only)"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[150px]"
                  />
                </div>

                {error && (
                  <Alert className="bg-red-900/20 border-red-500">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertTitle className="text-red-500">Error</AlertTitle>
                    <AlertDescription className="text-gray-300">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href="/dashboard/admin/scholarships">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
            {submitting ? "Updating..." : "Update Application"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
