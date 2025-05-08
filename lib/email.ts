"use server"

import { createClient } from "@supabase/supabase-js"
import Handlebars from "handlebars"
import nodemailer from "nodemailer"
import type { Database } from "@/types/supabase"

// Create a Supabase client for server-side operations
const supabaseAdmin = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number.parseInt(process.env.EMAIL_SERVER_PORT || "587"),
  secure: process.env.EMAIL_SERVER_SECURE === "true",
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

// Register Handlebars helpers
Handlebars.registerHelper("if", function (conditional, options) {
  if (conditional) {
    return options.fn(this)
  } else {
    return options.inverse(this)
  }
})

export async function sendEmail({
  to,
  templateId,
  variables,
  from = process.env.EMAIL_FROM || "noreply@unisync.edu",
}: {
  to: string
  templateId: string
  variables: Record<string, any>
  from?: string
}) {
  try {
    // Fetch the email template
    const { data: template, error: templateError } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .single()

    if (templateError || !template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Compile the template with Handlebars
    const compiledSubject = Handlebars.compile(template.subject)(variables)
    const compiledBody = Handlebars.compile(template.body)(variables)

    // Send the email
    const info = await transporter.sendMail({
      from,
      to,
      subject: compiledSubject,
      html: compiledBody,
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error }
  }
}

export async function scheduleClassReminders() {
  try {
    // Get upcoming classes in the next 2 hours
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const { data: upcomingSessions, error: sessionsError } = await supabaseAdmin
      .from("class_sessions")
      .select("*, courses(code, title)")
      .gte("start_time", now.toISOString())
      .lte("start_time", twoHoursLater.toISOString())
      .eq("reminder_sent", false)

    if (sessionsError) {
      throw sessionsError
    }

    if (!upcomingSessions || upcomingSessions.length === 0) {
      return { success: true, message: "No upcoming sessions to remind about" }
    }

    // Process each upcoming session
    for (const session of upcomingSessions) {
      // Get enrolled students for this course
      const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
        .from("enrollments")
        .select("*, users!inner(*)")
        .eq("course_id", session.course_id)

      if (enrollmentsError) {
        console.error(`Error fetching enrollments for course ${session.course_id}:`, enrollmentsError)
        continue
      }

      if (!enrollments || enrollments.length === 0) {
        continue
      }

      // Get notification settings for each student
      for (const enrollment of enrollments) {
        const user = enrollment.users
        if (!user || !user.email) continue

        // Check if user wants email reminders
        const { data: settings } = await supabaseAdmin
          .from("notification_settings")
          .select("*")
          .eq("user_id", user.id)
          .single()

        // Skip if user has opted out of class reminders
        if (settings && !settings.email_class_reminders) {
          continue
        }

        // Calculate minutes until class
        const startTime = new Date(session.start_time)
        const minutesUntil = Math.round((startTime.getTime() - now.getTime()) / (60 * 1000))

        // Only send if within the user's preferred reminder time
        const reminderTime = settings?.reminder_time_minutes || 60
        if (minutesUntil > reminderTime) {
          continue
        }

        // Format date and time for email
        const classDate = startTime.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        const classTime = startTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })

        // Send email reminder
        await sendEmail({
          to: user.email,
          templateId: "class_reminder",
          variables: {
            user_name: user.name,
            class_title: session.title,
            course_name: `${session.courses.code} - ${session.courses.title}`,
            minutes_until: minutesUntil,
            class_time: classTime,
            class_date: classDate,
            meeting_link: session.meeting_link || "",
          },
        })

        // Record notification in the database
        await supabaseAdmin.from("notifications").insert({
          user_id: user.id,
          type: "class_reminder",
          title: `Reminder: ${session.title}`,
          content: `Your class ${session.title} for ${session.courses.code} starts in ${minutesUntil} minutes.`,
          sent_at: new Date().toISOString(),
          metadata: {
            class_id: session.id,
            course_id: session.course_id,
          },
        })
      }

      // Mark reminder as sent
      await supabaseAdmin.from("class_sessions").update({ reminder_sent: true }).eq("id", session.id)
    }

    return { success: true, message: `Processed ${upcomingSessions.length} upcoming sessions` }
  } catch (error) {
    console.error("Error scheduling class reminders:", error)
    return { success: false, error }
  }
}

export async function sendAnnouncement({
  title,
  content,
  courseId,
  senderId,
}: {
  title: string
  content: string
  courseId?: string
  senderId: string
}) {
  try {
    // Get sender information
    const { data: sender, error: senderError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", senderId)
      .single()

    if (senderError || !sender) {
      throw new Error("Sender not found")
    }

    // Get recipients (either all users or users enrolled in a specific course)
    let recipients: { id: string; email: string; name: string }[] = []

    if (courseId) {
      // Get users enrolled in the course
      const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
        .from("enrollments")
        .select("*, users!inner(*)")
        .eq("course_id", courseId)

      if (enrollmentsError) {
        throw enrollmentsError
      }

      recipients = enrollments.map((enrollment) => ({
        id: enrollment.users.id,
        email: enrollment.users.email,
        name: enrollment.users.name,
      }))
    } else {
      // Get all users (for system-wide announcements)
      const { data: users, error: usersError } = await supabaseAdmin.from("users").select("id, email, name")

      if (usersError) {
        throw usersError
      }

      recipients = users
    }

    // Send announcement to each recipient
    for (const recipient of recipients) {
      // Check notification preferences
      const { data: settings } = await supabaseAdmin
        .from("notification_settings")
        .select("*")
        .eq("user_id", recipient.id)
        .single()

      // Skip if user has opted out of announcements
      if (settings && !settings.email_announcements) {
        continue
      }

      // Send email
      await sendEmail({
        to: recipient.email,
        templateId: "announcement",
        variables: {
          user_name: recipient.name,
          announcement_title: title,
          announcement_content: content,
          sender_name: sender.name,
        },
      })

      // Record notification in the database
      await supabaseAdmin.from("notifications").insert({
        user_id: recipient.id,
        type: "announcement",
        title,
        content,
        sent_at: new Date().toISOString(),
        metadata: {
          sender_id: senderId,
          course_id: courseId || null,
        },
      })
    }

    return { success: true, message: `Announcement sent to ${recipients.length} recipients` }
  } catch (error) {
    console.error("Error sending announcement:", error)
    return { success: false, error }
  }
}
