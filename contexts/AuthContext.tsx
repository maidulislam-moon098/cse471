"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]

type AuthContextType = {
  user: UserProfile | null
  session: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, role: "student" | "faculty" | "admin") => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true)
        console.log("Checking auth status...")

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Session error:", sessionError)
          throw sessionError
        }

        console.log("Session check result:", session ? "Session found" : "No session")

        if (session) {
          setSession(session.user)

          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (profileError) {
            console.error("Profile fetch error:", profileError)
            throw profileError
          }

          if (profile) {
            console.log("User profile found:", profile.email)
            setUser(profile)
          } else {
            console.log("No user profile found for id:", session.user.id)
          }
        }
      } catch (error) {
        console.error("Authentication error:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session ? "Session exists" : "No session")

      if (session) {
        setSession(session.user)

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (profileError) {
          console.error("Profile fetch error on auth change:", profileError)
        }

        if (profile) {
          console.log("User profile found on auth change:", profile.email)
          setUser(profile)
        } else {
          console.log("No user profile found for id on auth change:", session.user.id)
        }
      } else {
        setSession(null)
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      console.log("Login attempt with email:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Login error:", error)
        throw error
      }

      if (data && data.user) {
        console.log("Auth successful, fetching user profile")
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .single()

        if (profileError) {
          console.error("Profile fetch error:", profileError)
          throw profileError
        }

        if (profile) {
          setUser(profile)
          setSession(data.user)
          console.log("Login successful, redirecting to dashboard")
          router.push("/dashboard")
        } else {
          // If no profile exists, create one
          console.log("No profile found, creating one")
          const newProfile = {
            id: data.user.id,
            email: data.user.email || email,
            name: email.split("@")[0], // Default name from email
            role: "student" as const,
            is_verified: true,
          }

          const { error: insertError } = await supabase.from("users").insert(newProfile)

          if (insertError) {
            console.error("Profile creation error:", insertError)
            throw insertError
          }

          setUser(newProfile)
          setSession(data.user)
          console.log("Profile created, redirecting to dashboard")
          router.push("/dashboard")
        }
      } else {
        throw new Error("Authentication successful but user data is missing")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signup = async (name: string, email: string, password: string, role: "student" | "faculty" | "admin") => {
    setLoading(true)
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Create user profile in the users table
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id,
          email,
          name,
          role,
          is_verified: false,
        })

        if (profileError) {
          throw profileError
        }
      }

      alert("Registration successful! Please check your email for verification link.")
      router.push("/login")
    } catch (error) {
      console.error("Signup error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return

    try {
      const { error } = await supabase.from("users").update(data).eq("id", user.id)

      if (error) {
        throw error
      }

      // Update local state
      setUser((prev) => (prev ? { ...prev, ...data } : null))
    } catch (error) {
      console.error("Update profile error:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
