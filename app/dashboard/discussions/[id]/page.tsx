"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect, useRef } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, ThumbsUp, ArrowLeft, Send, Loader2, AlertCircle, Clock, CheckCircle2, Flag } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Discussion = {
  id: string
  title: string
  content: string
  course_id: string
  created_by: string
  created_at: string
  updated_at: string
  creator_name: string
  course_code: string
  course_title: string
  is_pinned: boolean
  is_closed: boolean
  view_count: number
  upvotes: any[]
  hasUserUpvoted?: boolean
}

type Comment = {
  id: string
  discussion_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user_name: string
  is_solution: boolean
  upvotes: any[]
  hasUserUpvoted?: boolean
}

export default function DiscussionDetail({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [discussion, setDiscussion] = useState<Discussion | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const supabase = getSupabaseBrowserClient()
  const commentEndRef = useRef<HTMLDivElement>(null)

  // Subscribe to real-time updates
  useEffect(() => {
    if (!params.id) return

    const channel = supabase
      .channel(`discussion-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussion_comments",
          filter: `discussion_id=eq.${params.id}`,
        },
        (payload) => {
          // Refresh comments when changes occur
          fetchDiscussionAndComments()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussion_upvotes",
        },
        (payload) => {
          // Refresh data when upvotes change
          fetchDiscussionAndComments()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id, supabase])

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (commentEndRef.current) {
      commentEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [comments])

  const fetchDiscussionAndComments = async () => {
    if (!user || !params.id) return

    try {
      setLoading(true)

      // Fetch discussion details
      const { data: discussionData, error: discussionError } = await supabase
        .from("discussions")
        .select(
          `
          *,
          users!discussions_created_by_fkey (name),
          courses!discussions_course_id_fkey (code, title),
          discussion_upvotes (id, user_id)
        `,
        )
        .eq("id", params.id)
        .single()

      if (discussionError) throw discussionError

      if (discussionData) {
        // Check if user has upvoted this discussion
        const hasUserUpvoted =
          discussionData.discussion_upvotes?.some((upvote: any) => upvote.user_id === user.id) || false

        setDiscussion({
          id: discussionData.id,
          title: discussionData.title,
          content: discussionData.content,
          course_id: discussionData.course_id,
          created_by: discussionData.created_by,
          created_at: discussionData.created_at,
          updated_at: discussionData.updated_at,
          creator_name: discussionData.users?.name || "Unknown",
          course_code: discussionData.courses?.code || "Unknown",
          course_title: discussionData.courses?.title || "Unknown",
          is_pinned: discussionData.is_pinned || false,
          is_closed: discussionData.is_closed || false,
          view_count: discussionData.view_count || 0,
          upvotes: discussionData.discussion_upvotes || [],
          hasUserUpvoted,
        })

        // Increment view count
        await supabase
          .from("discussions")
          .update({ view_count: (discussionData.view_count || 0) + 1 })
          .eq("id", params.id)
      }

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("discussion_comments")
        .select(
          `
          *,
          users!discussion_comments_user_id_fkey (name),
          discussion_upvotes (id, user_id)
        `,
        )
        .eq("discussion_id", params.id)
        .order("created_at", { ascending: true })

      if (commentsError) throw commentsError

      if (commentsData) {
        const formattedComments = commentsData.map((comment: any) => {
          // Check if user has upvoted this comment
          const hasUserUpvoted = comment.discussion_upvotes?.some((upvote: any) => upvote.user_id === user.id) || false

          return {
            id: comment.id,
            discussion_id: comment.discussion_id,
            user_id: comment.user_id,
            content: comment.content,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            user_name: comment.users?.name || "Unknown",
            is_solution: comment.is_solution || false,
            upvotes: comment.discussion_upvotes || [],
            hasUserUpvoted,
          }
        })

        setComments(formattedComments)
      }
    } catch (error) {
      console.error("Error fetching discussion:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscussionAndComments()
  }, [user, params.id])

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setMessage({ text: "You must be logged in to comment", type: "error" })
      return
    }

    if (!newComment.trim()) {
      setMessage({ text: "Comment cannot be empty", type: "error" })
      return
    }

    try {
      setSubmitting(true)
      setMessage({ text: "", type: "" })

      // Add comment
      const { data, error } = await supabase
        .from("discussion_comments")
        .insert({
          discussion_id: params.id,
          user_id: user.id,
          content: newComment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      // Clear the comment input
      setNewComment("")

      // The comment will be added via the real-time subscription
    } catch (error: any) {
      console.error("Error adding comment:", error)
      setMessage({ text: error.message || "Failed to add comment", type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvoteDiscussion = async () => {
    if (!user || !discussion) return

    try {
      if (discussion.hasUserUpvoted) {
        // Remove upvote
        await supabase.from("discussion_upvotes").delete().eq("discussion_id", discussion.id).eq("user_id", user.id)
      } else {
        // Add upvote
        await supabase.from("discussion_upvotes").insert({
          discussion_id: discussion.id,
          user_id: user.id,
          created_at: new Date().toISOString(),
        })
      }

      // Update local state immediately for better UX
      setDiscussion({
        ...discussion,
        hasUserUpvoted: !discussion.hasUserUpvoted,
        upvotes: discussion.hasUserUpvoted
          ? discussion.upvotes.filter((upvote: any) => upvote.user_id !== user.id)
          : [...discussion.upvotes, { id: "temp-id", user_id: user.id }],
      })
    } catch (error) {
      console.error("Error updating discussion upvote:", error)
    }
  }

  const handleUpvoteComment = async (commentId: string, hasUserUpvoted: boolean) => {
    if (!user) return

    try {
      if (hasUserUpvoted) {
        // Remove upvote
        await supabase.from("discussion_upvotes").delete().eq("comment_id", commentId).eq("user_id", user.id)
      } else {
        // Add upvote
        await supabase.from("discussion_upvotes").insert({
          comment_id: commentId,
          user_id: user.id,
          created_at: new Date().toISOString(),
        })
      }

      // Update local state immediately for better UX
      setComments(
        comments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              hasUserUpvoted: !hasUserUpvoted,
              upvotes: hasUserUpvoted
                ? comment.upvotes.filter((upvote: any) => upvote.user_id !== user.id)
                : [...comment.upvotes, { id: "temp-id", user_id: user.id }],
            }
          }
          return comment
        }),
      )
    } catch (error) {
      console.error("Error updating comment upvote:", error)
    }
  }

  const markAsSolution = async (commentId: string, isSolution: boolean) => {
    if (!user || !discussion || discussion.created_by !== user.id) return

    try {
      // Update the comment
      await supabase
        .from("discussion_comments")
        .update({
          is_solution: !isSolution,
        })
        .eq("id", commentId)

      // Update local state immediately for better UX
      setComments(
        comments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              is_solution: !isSolution,
            }
          }
          return comment
        }),
      )
    } catch (error) {
      console.error("Error marking comment as solution:", error)
    }
  }

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold">Discussion</h1>
        <p className="mt-4 text-muted-foreground">Please log in to view discussions.</p>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex justify-between items-center">
        <Link href="/dashboard/discussions" className="flex items-center text-primary hover:text-primary/80">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Discussions
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center mt-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : discussion ? (
        <div className="mt-6">
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {discussion.is_pinned && (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                        Pinned
                      </Badge>
                    )}
                    <Badge variant="outline">{discussion.course_code}</Badge>
                  </div>
                  <h1 className="text-2xl font-bold">{discussion.title}</h1>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-1 ${discussion.hasUserUpvoted ? "bg-primary/10 text-primary" : ""}`}
                  onClick={handleUpvoteDiscussion}
                >
                  <ThumbsUp className={`h-4 w-4 ${discussion.hasUserUpvoted ? "fill-primary" : ""}`} />
                  <span>{discussion.upvotes.length}</span>
                </Button>
              </div>
              <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(discussion.creator_name)}`}
                    />
                    <AvatarFallback>{getUserInitials(discussion.creator_name)}</AvatarFallback>
                  </Avatar>
                  <span>{discussion.creator_name}</span>
                </div>
                <span className="mx-2">•</span>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}</span>
                </div>
                <span className="mx-2">•</span>
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  <span>{comments.length} comments</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{discussion.content}</p>
              </div>
            </CardContent>
          </Card>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Comments ({comments.length})</h2>
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <Card key={comment.id} className={comment.is_solution ? "border-green-500" : ""}>
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.user_name)}`}
                            />
                            <AvatarFallback>{getUserInitials(comment.user_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{comment.user_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        {comment.is_solution && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Solution
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{comment.content}</p>
                    </CardContent>
                    <CardFooter className="pt-0 pb-3 flex justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-1 ${comment.hasUserUpvoted ? "text-primary" : ""}`}
                          onClick={() => handleUpvoteComment(comment.id, comment.hasUserUpvoted || false)}
                        >
                          <ThumbsUp className={`h-4 w-4 ${comment.hasUserUpvoted ? "fill-primary" : ""}`} />
                          <span>{comment.upvotes.length}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <Flag className="h-4 w-4" />
                          <span>Report</span>
                        </Button>
                      </div>
                      {discussion.created_by === user.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${comment.is_solution ? "bg-green-500/10 text-green-500 border-green-500" : ""}`}
                          onClick={() => markAsSolution(comment.id, comment.is_solution)}
                        >
                          {comment.is_solution ? "Remove Solution" : "Mark as Solution"}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-6 text-center">
                    <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
                  </CardContent>
                </Card>
              )}
              <div ref={commentEndRef} />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Add a Comment</h2>
            {message.text && (
              <Alert variant={message.type === "success" ? "default" : "destructive"} className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{message.type === "success" ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCommentSubmit} className="space-y-4">
              <Textarea
                className="min-h-[120px]"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your comment here..."
                disabled={submitting}
                required
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting || !newComment.trim()}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="mt-10 text-center">
          <p className="text-muted-foreground">Discussion not found or you don't have permission to view it.</p>
          <Link href="/dashboard/discussions" className="mt-4 btn-primary inline-block">
            Back to Discussions
          </Link>
        </div>
      )}
    </div>
  )
}
