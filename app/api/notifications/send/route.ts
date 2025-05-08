import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Create a Supabase client for server-side operations
const supabaseAdmin = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: Request) {
  try {
    const { userId, type, title, content, metadata } = await request.json()

    // Validate input
    if (!userId || !type || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create notification in the database
    const { data, error } = await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type,
      title,
      content,
      sent_at: new Date().toISOString(),
      metadata,
    })

    if (error) {
      console.error("Error creating notification:", error)
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
    }

    // Check if user wants email notifications for this type
    const { data: settings } = await supabaseAdmin
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .single()

    // Get user email
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Send email notification if user has enabled it for this type
    if (type === "assignment_graded" && settings?.email_grade_updates) {
      // Send email notification
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: user.email,
            subject: title,
            text: content,
            html: `<p>Hello ${user.name},</p><p>${content}</p><p>Log in to view your grade and feedback.</p>`,
          }),
        })
      } catch (emailError) {
        console.error("Error sending email notification:", emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in notification API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
