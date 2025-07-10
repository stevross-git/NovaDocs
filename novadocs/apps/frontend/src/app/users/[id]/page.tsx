'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'

interface User {
  id: string | number
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'editor' | 'viewer'
  avatar_url?: string
}

export default function UserDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { register, handleSubmit, reset } = useForm<{ name: string; email: string; role: User['role'] }>({
    defaultValues: { role: 'viewer' }
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchUser(id as string)
    }
  }, [id])

  const fetchUser = async (userId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        reset({ name: data.user.name, email: data.user.email, role: data.user.role })
      } else {
        setError(`Failed to load user: ${res.status}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: { name: string; email: string; role: User['role'] }) => {
    if (!id) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        router.push('/users')
      } else {
        setError(`Failed to update user: ${res.status}`)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading user...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || 'User not found'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Link href="/users" className="text-blue-600 hover:text-blue-800">
            ← Back to Users
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Edit User</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border p-6 rounded-lg space-y-4 max-w-md mx-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              {...register('name', { required: true })}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email', { required: true })}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              {...register('role', { required: true })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
