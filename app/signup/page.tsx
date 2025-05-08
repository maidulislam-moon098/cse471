"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { FcGoogle } from "react-icons/fc"

export default function Signup() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"student" | "faculty" | "admin">("student")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const { signup } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      await signup(name, email, password, role)
    } catch (err: any) {
      setError(err.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-600 mb-2">UniSync</h1>
          <p className="text-gray-400">Create your account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">I am a</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`py-2 px-4 rounded transition-colors ${
                  role === "student"
                    ? "bg-purple-600 text-white"
                    : "bg-background text-gray-300 border border-gray-700 hover:border-gray-600"
                }`}
                onClick={() => setRole("student")}
              >
                Student
              </button>
              <button
                type="button"
                className={`py-2 px-4 rounded transition-colors ${
                  role === "faculty"
                    ? "bg-purple-600 text-white"
                    : "bg-background text-gray-300 border border-gray-700 hover:border-gray-600"
                }`}
                onClick={() => setRole("faculty")}
              >
                Faculty
              </button>
              <button
                type="button"
                className={`py-2 px-4 rounded transition-colors ${
                  role === "admin"
                    ? "bg-purple-600 text-white"
                    : "bg-background text-gray-300 border border-gray-700 hover:border-gray-600"
                }`}
                onClick={() => setRole("admin")}
              >
                Admin
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary mt-6" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

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
            Already have an account?{" "}
            <Link href="/login" className="text-purple-500 hover:text-purple-400">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
