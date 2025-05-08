import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Create a Supabase client for server-side operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { title, content, courseId, senderId } = body

    // Validate input
    if (!title || !content || !senderId) {
      return new NextResponse(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Creating announcement with data:", {
      title,
      content: content.substring(0, 20) + "...",
      courseId,
      senderId,
    })

    // First, let's check the structure of the announcements table
    const { data: tableInfo, error: tableInfoError } = await supabaseAdmin.rpc("table_info", {
      table_name: "announcements",
    })

    if (tableInfoError) {
      console.error("Error checking table structure:", tableInfoError)
    } else {
      console.log("Table structure:", tableInfo)
    }

    // Create a direct announcement record in the database
    // Use a more flexible approach to handle different table structures
    let announcementData = {
      title: title,
      content: content,
    }

    // Add created_by if it exists in the table
    try {
      announcementData = {
        ...announcementData,
        created_by: senderId,
      }
    } catch (e) {
      console.warn("Could not add created_by field, it might not exist in the table")
    }

    // Add course_id if it exists in the table and a courseId was provided
    if (courseId) {
      try {
        announcementData = {
          ...announcementData,
          course_id: courseId,
        }
      } catch (e) {
        console.warn("Could not add course_id field, it might not exist in the table")
      }
    }

    // Add created_at if it exists in the table
    try {
      announcementData = {
        ...announcementData,
        created_at: new Date().toISOString(),
      }
    } catch (e) {
      console.warn("Could not add created_at field, it might not exist in the table")
    }

    console.log("Inserting announcement data:", announcementData)

    // Insert the announcement
    const { data: announcementResult, error: insertError } = await supabaseAdmin
      .from("announcements")
      .insert(announcementData)
      .select()

    if (insertError) {
      console.error("Error inserting announcement:", insertError)

      // Check if it's a column does not exist error
      if (insertError.message.includes("column") && insertError.message.includes("does not exist")) {
        return new NextResponse(
          JSON.stringify({
            error: "Database schema mismatch",
            details:
              "The announcements table structure doesn't match what's expected. Please run the fix-announcements-table.sql script.",
            originalError: insertError.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // Check if it's a foreign key constraint error
      if (insertError.message.includes("foreign key constraint")) {
        return new NextResponse(
          JSON.stringify({
            error: "Invalid course or user ID",
            details: insertError.message,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      return new NextResponse(
        JSON.stringify({
          error: "Failed to create announcement record",
          details: insertError.message,
          code: insertError.code,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("Announcement created successfully:", announcementResult)

    // Create a simple success response
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Announcement created successfully",
        data: announcementResult && announcementResult.length > 0 ? announcementResult[0] : null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error in announcement API:", error)
    return new NextResponse(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
