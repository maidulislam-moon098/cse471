"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function VerifyEmail() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const type = searchParams.get("type")
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        if (type === "signup" && token) {
          // For new sign-ups, the token is handled automatically by Supabase
          setIsSuccess(true)
        } else if (type === "recovery" && token) {
          // For password recovery
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: "recovery",
          })

          if (error) {
            throw error
          }

          setIsSuccess(true)
        } else {
          setIsSuccess(false)
        }
      } catch (error) {
        console.error("Verification error:", error)
        setIsSuccess(false)
      } finally {
        setIsVerifying(false)
      }
    }

    if (token) {
      verifyEmail()
    } else {
      setIsVerifying(false)
      setIsSuccess(false)
    }
  }, [token, type])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-purple-600 mb-2">UniSync</h1>
        <h2 className="text-2xl font-semibold mb-6">Email Verification</h2>

        {isVerifying ? (
          <div className="py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-300">Verifying your email...</p>
          </div>
        ) : isSuccess ? (
          <div className="py-8">
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-gray-300">Your email has been verified successfully!</p>
            <Link href="/login" className="btn-primary inline-block mt-6 max-w-xs">
              Proceed to Login
            </Link>
          </div>
        ) : (
          <div className="py-8">
            <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mt-4 text-gray-300">Verification failed. The link may be invalid or expired.</p>
            <Link href="/login" className="btn-outline inline-block mt-6 max-w-xs">
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
