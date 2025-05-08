"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function CreateScholarshipPage() {
  const { user } = useAuth()
  const router = useRouter()
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
    // Check if user is admin
    if (user && user.role !== "admin") {
      router.push("/dashboard")
    } else {
      setLoading(false)
    }
  }, [user, router])

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

      // Submit scholarship
      const { error } = await supabase.from("scholarships").insert({
        name,
        description,
        amount: Number.parseFloat(amount),
        requirements,
        deadline,
        academic_year: academicYear,
        is_active: isActive,
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard/admin/scholarships")
      }, 2000)
    } catch (error) {
      console.error("Error creating scholarship:", error)
      setError("Failed to create scholarship. Please try again.")
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
          <AlertTitle className="text-green-500">Scholarship Created</AlertTitle>
          <AlertDescription className="text-gray-300">
            The scholarship has been created successfully. You will be redirected to the scholarships page.
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
          <CardTitle className="text-white text-xl">Create New Scholarship</CardTitle>
          <CardDescription className="text-gray-400">
            Create a new scholarship program for students to apply
          </CardDescription>
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
                  Amount (USD) <span className="text-red-500">*</span>
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
            {submitting ? "Creating..." : "Create Scholarship"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
