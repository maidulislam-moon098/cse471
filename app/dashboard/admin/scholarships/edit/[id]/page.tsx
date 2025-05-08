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
import { Switch } from "@/components/ui/switch"
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

export default function EditScholarshipPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const scholarshipId = params.id as string
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = getSupabaseBrowserClient()

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [requirements, setRequirements] = useState("")
  const [deadline, setDeadline] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    const fetchScholarship = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Check if user is admin
        if (user.role !== "admin") {
          router.push("/dashboard")
          return
        }

        // Fetch scholarship details
        const { data, error } = await supabase.from("scholarships").select("*").eq("id", scholarshipId).single()

        if (error) throw error
        if (!data) {
          router.push("/dashboard/admin/scholarships")
          return
        }

        // Format date for datetime-local input
        const deadlineDate = new Date(data.deadline)
        const formattedDeadline = deadlineDate.toISOString().slice(0, 16)

        // Set form values
        setName(data.name)
        setDescription(data.description || "")
        setAmount(data.amount.toString())
        setRequirements(data.requirements || "")
        setDeadline(formattedDeadline)
        setAcademicYear(data.academic_year || "")
        setIsActive(data.is_active)
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
    if (!user) return

    try {
      setSubmitting(true)
      setError(null)

      // Validate form
      if (!name || !amount || !deadline) {
        setError("Please fill in all required fields")
        return
      }

      // Update scholarship
      const { error } = await supabase
        .from("scholarships")
        .update({
          name,
          description,
          amount: Number.parseFloat(amount),
          requirements,
          deadline,
          academic_year: academicYear,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scholarshipId)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard/admin/scholarships")
      }, 2000)
    } catch (error) {
      console.error("Error updating scholarship:", error)
      setError("Failed to update scholarship. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <Alert className="bg-green-900/20 border-green-500">
          <AlertCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-500">Scholarship Updated</AlertTitle>
          <AlertDescription className="text-gray-300">
            The scholarship has been updated successfully. You will be redirected to the scholarships page.
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
          <CardTitle className="text-white text-xl">Edit Scholarship</CardTitle>
          <CardDescription className="text-gray-400">Update scholarship details</CardDescription>
        </CardHeader>
        <CardContent>
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
                <Label htmlFor="name" className="text-white">
                  Scholarship Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Merit Scholarship 2023"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide a description of the scholarship"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="amount" className="text-white">
                  Amount (BDT) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="requirements" className="text-white">
                  Requirements
                </Label>
                <Textarea
                  id="requirements"
                  placeholder="List eligibility requirements for this scholarship"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="deadline" className="text-white">
                  Application Deadline <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="academicYear" className="text-white">
                  Academic Year
                </Label>
                <Input
                  id="academicYear"
                  placeholder="e.g., 2023-2024"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="isActive" className="text-white">
                  Active (visible to students)
                </Label>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href="/dashboard/admin/scholarships">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
            {submitting ? "Updating..." : "Update Scholarship"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
