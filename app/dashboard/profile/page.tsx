"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    department: user?.department || "",
    bio: user?.bio || "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        bio: formData.bio,
      })
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Profile</h1>
      <p className="mt-1 text-gray-400">Manage your account settings and profile information</p>

      {error && <div className="error-message mt-4">{error}</div>}

      <div className="mt-6 bg-card p-6 rounded-lg border border-gray-800">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/3 flex flex-col items-center p-4">
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-800">
              <div className="w-full h-full flex items-center justify-center bg-purple-600 text-white text-5xl font-bold">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <h2 className="mt-4 text-xl font-medium text-white">{user?.name}</h2>
            <p className="text-gray-400 capitalize">{user?.role}</p>

            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="mt-4 btn-primary">
                Edit Profile
              </button>
            )}
          </div>

          <div className="md:w-2/3 p-4">
            {isEditing ? (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-group">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className="input-field"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="input-field"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-1">
                      Phone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="text"
                      className="input-field"
                      value={formData.phone || ""}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="department" className="block text-sm font-medium text-gray-400 mb-1">
                      Department
                    </label>
                    <input
                      id="department"
                      name="department"
                      type="text"
                      className="input-field"
                      value={formData.department || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group mt-4">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    className="input-field"
                    value={formData.bio || ""}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white">Personal Information</h3>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Full Name</p>
                      <p className="text-gray-300">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-gray-300">{formData.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Phone</p>
                      <p className="text-gray-300">{formData.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Department</p>
                      <p className="text-gray-300">{formData.department || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white">Bio</h3>
                  <p className="mt-2 text-gray-300">{formData.bio || "No bio provided."}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
