"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function NotificationSettings() {
  const { user } = useAuth()
  // Update the state to match the actual database column names
  const [settings, setSettings] = useState({
    email_class_reminder: true,
    email_announcements: true,
    email_assignment_reminders: true,
    email_grade_updates: true,
    reminder_time_minutes: 60,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Check if settings exist for this user
        const { data, error } = await supabase.from("notification_settings").select("*").eq("user_id", user.id).single()

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "no rows returned" error
          throw error
        }

        if (data) {
          // Update the useEffect to match the actual database column names
          setSettings({
            email_class_reminder: data.email_class_reminder,
            email_announcements: data.email_announcements,
            email_assignment_reminders: data.email_assignment_reminders,
            email_grade_updates: data.email_grade_updates,
            reminder_time_minutes: data.reminder_time_minutes || 60,
          })
        }
      } catch (error) {
        console.error("Error fetching notification settings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSaving(true)
      setMessage({ text: "", type: "" })

      // Check if settings exist
      const { data: existingSettings, error: checkError } = await supabase
        .from("notification_settings")
        .select("user_id")
        .eq("user_id", user.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      let error

      if (existingSettings) {
        // Update existing settings
        const { error: updateError } = await supabase
          .from("notification_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)

        error = updateError
      } else {
        // Insert new settings
        const { error: insertError } = await supabase.from("notification_settings").insert({
          user_id: user.id,
          ...settings,
        })

        error = insertError
      }

      if (error) throw error

      setMessage({ text: "Notification settings saved successfully", type: "success" })
    } catch (error: any) {
      console.error("Error saving notification settings:", error)
      setMessage({ text: error.message || "Failed to save settings", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Notification Settings</h1>
      <p className="mt-1 text-gray-400">Manage how and when you receive notifications</p>

      {message.text && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 bg-card p-6 rounded-lg border border-gray-800">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-white mb-4">Email Notifications</h2>
              <div className="space-y-4">
                {/* Update the checkbox IDs and names to match the database columns */}
                <div className="flex items-center">
                  <input
                    id="email_class_reminder"
                    name="email_class_reminder"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-600"
                    checked={settings.email_class_reminder}
                    onChange={handleChange}
                  />
                  <label htmlFor="email_class_reminder" className="ml-3 text-sm text-gray-300">
                    Class reminders
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="email_announcements"
                    name="email_announcements"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-600"
                    checked={settings.email_announcements}
                    onChange={handleChange}
                  />
                  <label htmlFor="email_announcements" className="ml-3 text-sm text-gray-300">
                    Announcements
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="email_assignment_reminders"
                    name="email_assignment_reminders"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-600"
                    checked={settings.email_assignment_reminders}
                    onChange={handleChange}
                  />
                  <label htmlFor="email_assignment_reminders" className="ml-3 text-sm text-gray-300">
                    Assignment reminders
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="email_grade_updates"
                    name="email_grade_updates"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-600"
                    checked={settings.email_grade_updates}
                    onChange={handleChange}
                  />
                  <label htmlFor="email_grade_updates" className="ml-3 text-sm text-gray-300">
                    Grade updates
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-white mb-4">Reminder Preferences</h2>
              <div>
                <label htmlFor="reminder_time_minutes" className="block text-sm font-medium text-gray-400 mb-1">
                  Send class reminders
                </label>
                <div className="flex items-center">
                  <select
                    id="reminder_time_minutes"
                    name="reminder_time_minutes"
                    className="input-field"
                    value={settings.reminder_time_minutes}
                    onChange={handleChange}
                  >
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="120">2 hours before</option>
                    <option value="1440">1 day before</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
