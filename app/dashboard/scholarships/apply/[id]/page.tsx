"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
}

export default function ScholarshipApplicationPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const scholarshipId = params.id as string
  const [scholarship, setScholarship] = useState<Scholarship | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = getSupabaseBrowserClient()

  // Form state
  const [gpa, setGpa] = useState("")
  const [financialInfo, setFinancialInfo] = useState("")
  const [statement, setStatement] = useState("")

  useEffect(() => {
    const fetchScholarship = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Check if user is a student
        if (user.role !== "student") {
          router.push("/dashboard/scholarships")
          return
        }

        // Fetch scholarship details
        const { data, error } = await supabase
          .from("scholarships")
          .select("*")
          .eq("id", scholarshipId)
          .eq("is_active", true)
          .single()

        if (error) throw error
        if (!data) {
          router.push("/dashboard/scholarships")
          return
        }

        setScholarship(data)

        // Check if user has already applied
        const { data: existingApplication, error: applicationError } = await supabase
          .from("scholarship_applications")
          .select("id")
          .eq("scholarship_id", scholarshipId)
          .eq("user_id", user.id)
          .maybeSingle()

        if (applicationError) throw applicationError
        if (existingApplication) {
          router.push("/dashboard/scholarships")
          return
        }
      } catch (error) {
        console.error("Error fetching scholarship:", error)
        setError("Failed to load scholarship details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchScholarship()
  }, [user, scholarshipId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !scholarship) return

    try {
      setSubmitting(true)
      setError(null)

      // Validate form
      if (!gpa || !financialInfo || !statement) {
        setError("Please fill in all required fields")
        return
      }

      // Submit application
      const { error } = await supabase.from("scholarship_applications").insert({
        scholarship_id: scholarshipId,
        user_id: user.id,
        gpa: Number.parseFloat(gpa),
        financial_info: financialInfo,
        statement_of_purpose: statement,
        supporting_documents: [],
        status: "pending",
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard/scholarships")
      }, 2000)
    } catch (error) {
      console.error("Error submitting application:", error)
      setError("Failed to submit application. Please try again.")
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
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!scholarship) {
    return (
      <div className="text-center mt-10">
        <p className="text-gray-400">Scholarship not found or no longer available.</p>
        <Link href="/dashboard/scholarships">
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
          <AlertTitle className="text-green-500">Application Submitted</AlertTitle>
          <AlertDescription className="text-gray-300">
            Your scholarship application has been submitted successfully. You will be redirected to the scholarships
            page.
          </AlertDescription>
        </Alert>
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
          <CardTitle className="text-white text-xl">Apply for Scholarship</CardTitle>
          <CardDescription className="text-gray-400">{scholarship.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-white font-medium mb-2">Scholarship Details</h3>
            <div className="bg-gray-800/50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <p className="text-gray-400 text-sm">Amount</p>
                  <p className="text-white">{formatCurrency(scholarship.amount)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Deadline</p>
                  <p className="text-white">{formatDate(scholarship.deadline)}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Requirements</p>
                <p className="text-white">{scholarship.requirements || "No specific requirements listed."}</p>
              </div>
            </div>
          </div>

          <Separator className="my-6 bg-gray-700" />

          {error && (
            <Alert className="mb-6 bg-red-900/20 border-red-500">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertTitle className="text-red-500">Error</AlertTitle>
              <AlertDescription className="text-gray-300">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label htmlFor="gpa" className="text-white">
                  Current GPA <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4.0"
                  placeholder="e.g., 3.75"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="financialInfo" className="text-white">
                  Financial Information <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="financialInfo"
                  placeholder="Describe your financial situation and need for this scholarship"
                  value={financialInfo}
                  onChange={(e) => setFinancialInfo(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[100px]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="statement" className="text-white">
                  Statement of Purpose <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="statement"
                  placeholder="Explain why you deserve this scholarship and how it will help you achieve your academic goals"
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[150px]"
                  required
                />
              </div>
            </div>

            <div className="mt-8 text-sm text-gray-400">
              <p>
                By submitting this application, you confirm that all information provided is accurate and complete.
                False information may result in disqualification.
              </p>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href="/dashboard/scholarships">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
