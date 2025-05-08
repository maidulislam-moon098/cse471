import { getSupabaseBrowserClient } from "./supabase"

/**
 * Helper function to check if the materials bucket exists
 */
export const checkMaterialsBucket = async (): Promise<boolean> => {
  const supabase = getSupabaseBrowserClient()

  try {
    // Try to list files in the bucket to check if it exists
    const { data, error } = await supabase.storage.from("materials").list()

    if (error) {
      console.error("Error checking materials bucket:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Unexpected error checking materials bucket:", error)
    return false
  }
}

/**
 * Upload a file to the materials bucket
 * @param file The file to upload
 * @param path The path within the bucket
 * @returns The public URL of the uploaded file or null if upload failed
 */
export const uploadMaterial = async (file: File, path: string): Promise<string | null> => {
  const supabase = getSupabaseBrowserClient()

  // Check if the bucket exists
  const bucketExists = await checkMaterialsBucket()
  if (!bucketExists) {
    throw new Error(
      "Materials storage bucket does not exist. Please create it in the Supabase dashboard or contact an administrator.",
    )
  }

  // Upload the file
  const { data, error } = await supabase.storage.from("materials").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    console.error("Error uploading file:", error)
    throw error
  }

  // Get the public URL
  const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path)

  return urlData?.publicUrl || null
}

/**
 * Delete a file from the materials bucket
 * @param path The path of the file to delete
 * @returns True if deletion was successful, false otherwise
 */
export const deleteMaterial = async (path: string): Promise<boolean> => {
  const supabase = getSupabaseBrowserClient()

  try {
    const { error } = await supabase.storage.from("materials").remove([path])

    if (error) {
      console.error("Error deleting file:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Unexpected error deleting file:", error)
    return false
  }
}

/**
 * Get a list of files in a directory
 * @param directory The directory path to list
 * @returns Array of file objects or null if error
 */
export const listMaterials = async (directory: string): Promise<any[] | null> => {
  const supabase = getSupabaseBrowserClient()

  try {
    const { data, error } = await supabase.storage.from("materials").list(directory)

    if (error) {
      console.error("Error listing files:", error)
      return null
    }

    return data || []
  } catch (error) {
    console.error("Unexpected error listing files:", error)
    return null
  }
}
