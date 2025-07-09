'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'

interface User {
  id: string | number
  name: string
  email: string
  avatar_url?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { register, handleSubmit, reset } = useForm<{ name: string; email: string }>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      } else {
        setError(`Failed to load users: ${res.status}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: { name: string; email: string }) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      if (res.ok) {
        const data = await res.json()
        setUsers((prev) => [...prev, data.user])
        reset()
      } else {
        setError(`Failed to create user: ${res.status}`)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto mb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white border p-6 rounded-lg space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Add New User</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                {...register('name', { required: true })}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email', { required: true })}
                className="w-full border rounded-md px-3 py-2"
                placeholder="user@example.com"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Create User
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow-sm border p-6 flex items-center space-x-4">
              {user.avatar_url && (
                <Image
                  src={user.avatar_url}
                  alt={user.name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              )}
              <div>
                <p className="text-lg font-semibold text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
