"use server"

import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"
import type { Database } from "@/types/supabase"

// Create a Supabase client for server-side operations
const supabaseAdmin = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function logActivity({
  userId,
  action,
  details,
}: {
  userId: string | null
  action: string
  details?: Record<string, any>
}) {
  try {
    // Get IP address from headers
    const headersList = headers()
    const forwardedFor = headersList.get("x-forwarded-for")
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown"

    // Log the activity
    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      action,
      details,
      ip_address: ipAddress,
    })

    return { success: true }
  } catch (error) {
    console.error("Error logging activity:", error)
    return { success: false, error }
  }
}
