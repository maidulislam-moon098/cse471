import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient()

    // Create the materials bucket if it doesn't exist
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket("materials", {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
    })

    if (bucketError && !bucketError.message.includes("already exists")) {
      console.error("Error creating bucket:", bucketError)
      return NextResponse.json({ error: bucketError.message }, { status: 500 })
    }

    // Create policies for the bucket
    const policies = [
      {
        name: "authenticated users can upload",
        definition: "authenticated",
        operation: "INSERT",
        check: "true",
      },
      {
        name: "authenticated users can select",
        definition: "authenticated",
        operation: "SELECT",
        check: "true",
      },
      {
        name: "authenticated users can update own files",
        definition: "authenticated",
        operation: "UPDATE",
        check: "owner = auth.uid()",
      },
      {
        name: "authenticated users can delete own files",
        definition: "authenticated",
        operation: "DELETE",
        check: "owner = auth.uid()",
      },
    ]

    // We can't directly create policies via the JavaScript client
    // This is just a placeholder to indicate what policies should be created
    // In practice, you would need to use the Supabase dashboard or SQL to create these

    return NextResponse.json({
      success: true,
      message: "Materials bucket created or already exists",
      note: "Policies need to be created via the Supabase dashboard or direct SQL",
    })
  } catch (error) {
    console.error("Unexpected error creating bucket:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
