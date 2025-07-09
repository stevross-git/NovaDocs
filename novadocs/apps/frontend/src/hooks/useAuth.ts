import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  token: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock user for development
    const mockUser: User = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      token: 'mock-token'
    }
    
    setUser(mockUser)
    setLoading(false)
  }, [])

  return { user, loading }
}
