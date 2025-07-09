// apps/frontend/src/hooks/useAuth.ts
import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  token: string
  avatar_url?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (provider: string) => {
    try {
      const response = await fetch(`/api/auth/${provider}`)
      const data = await response.json()
      
      // Redirect to OAuth provider
      window.location.href = data.auth_url
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      setUser(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return { user, loading, login, logout }
}