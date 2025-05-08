"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { FcGoogle } from "react-icons/fc"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState("")

  const { login } = useAuth()
  const supabase = getSupabaseBrowserClient()

  // Debug function to check Supabase connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from("users").select("count").limit(1)
        if (error) {
          setDebugInfo(`Database connection error: ${error.message}`)
        } else {
          setDebugInfo("Database connection successful")
        }
      } catch (err: any) {
        setDebugInfo(`Error checking connection: ${err.message}`)
      }
    }

    checkConnection()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log("Attempting to login with:", email)

      // Direct Supabase auth check for debugging
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error("Direct auth error:", authError)
        setError(`Auth error: ${authError.message}`)
        return
      }

      console.log("Direct auth successful:", authData)

      // Now try the regular login flow
      await login(email, password)
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Invalid login credentials. Please check your email and password.")
    } finally {
      setIsLoading(false)
    }
  }

  // Test user creation function - use only if needed
  const createTestUser = async () => {
    try {
      setIsLoading(true)

      // Create a test user with auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "test@example.com",
        password: "password123",
      })

      if (authError) throw authError

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id,
          email: "test@example.com",
          name: "Test User",
          role: "student",
          is_verified: true,
        })

        if (profileError) throw profileError

        setDebugInfo("Test user created successfully! Email: test@example.com, Password: password123")
      }
    } catch (err: any) {
      setError(`Failed to create test user: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-600 mb-2">UniSync</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        {error && <div className="bg-red-900/50 text-red-200 p-3 rounded-md mb-4">{error}</div>}
        {debugInfo && <div className="bg-blue-900/50 text-blue-200 p-3 rounded-md mb-4">{debugInfo}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-400">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm text-purple-500 hover:text-purple-400">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary mt-6" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex justify-center">
          <button
            onClick={createTestUser}
            className="text-sm text-purple-500 hover:text-purple-400 underline"
            disabled={isLoading}
          >
            Create Test User
          </button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-700 rounded-md shadow-sm bg-background text-gray-300 hover:bg-gray-900"
            >
              <FcGoogle className="h-5 w-5 mr-2" />
              Google
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-purple-500 hover:text-purple-400">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
