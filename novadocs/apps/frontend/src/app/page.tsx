'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Activity, Database, Search, Users, Settings, Plus } from 'lucide-react'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState('')
  const [graphqlStatus, setGraphqlStatus] = useState('')

  const handleTestRest = async () => {
    setIsLoading(true)
    setApiStatus('Testing REST API...')
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${backendUrl}/health`)
      
      if (response.ok) {
        const data = await response.json()
        setApiStatus(`✅ REST API: Connected! Status: ${data.status} (${data.version})`)
      } else {
        setApiStatus(`❌ REST API: Error ${response.status}`)
      }
    } catch (error) {
      setApiStatus(`❌ REST API: ${error.message}`)
    }
    
    setIsLoading(false)
  }

  const handleTestGraphQL = async () => {
    setIsLoading(true)
    setGraphqlStatus('Testing GraphQL API...')
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    try {
      const response = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ me { id name email } }'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setGraphqlStatus(`✅ GraphQL: Connected! User: ${data.data.me.name}`)
      } else {
        setGraphqlStatus(`❌ GraphQL: Error ${response.status}`)
      }
    } catch (error) {
      setGraphqlStatus(`❌ GraphQL: ${error.message}`)
    }
    
    setIsLoading(false)
  }

  const quickActions = [
    { name: 'New Page', href: '/editor', icon: Plus, color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'View Stats', href: '/stats', icon: Activity, color: 'bg-purple-600 hover:bg-purple-700' },
    { name: 'Search', href: '/search', icon: Search, color: 'bg-green-600 hover:bg-green-700' },
    { name: 'Database', href: '/database', icon: Database, color: 'bg-orange-600 hover:bg-orange-700' },
  ]

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to NovaDocs
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A modern collaborative wiki platform for teams
          </p>
          
          {/* API Status */}
          {(apiStatus || graphqlStatus) && (
            <div className="mb-8 space-y-2">
              {apiStatus && (
                <div className={`p-3 rounded-lg shadow-sm max-w-md mx-auto ${
                  apiStatus.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  <p className="text-sm">{apiStatus}</p>
                </div>
              )}
              {graphqlStatus && (
                <div className={`p-3 rounded-lg shadow-sm max-w-md mx-auto ${
                  graphqlStatus.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  <p className="text-sm">{graphqlStatus}</p>
                </div>
              )}
            </div>
          )}
          
          {/* API Test Buttons */}
          <div className="space-x-4 mb-12">
            <button 
              onClick={handleTestRest}
              disabled={isLoading}
              className={`${
                isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-semibold py-3 px-6 rounded-lg transition-colors`}
            >
              {isLoading ? 'Testing...' : 'Test REST API'}
            </button>
            <button 
              onClick={handleTestGraphQL}
              disabled={isLoading}
              className={`${
                isLoading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
              } text-white font-semibold py-3 px-6 rounded-lg transition-colors`}
            >
              {isLoading ? 'Testing...' : 'Test GraphQL'}
            </button>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.name}
                  href={action.href}
                  className={`${action.color} text-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1`}
                >
                  <div className="flex items-center">
                    <Icon className="h-8 w-8 mr-3" />
                    <span className="text-lg font-semibold">{action.name}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
        
        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Real-time Collaboration
            </h3>
            <p className="text-gray-600">
              Work together in real-time with CRDT-powered collaborative editing
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Structured Data
            </h3>
            <p className="text-gray-600">
              Create databases with table, kanban, and calendar views
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Powerful Search
            </h3>
            <p className="text-gray-600">
              Full-text and semantic search across all your content
            </p>
          </div>
        </div>
        
        {/* System Status */}
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              🚀 System Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-center">
                <span className="text-green-500 text-2xl">✅</span>
                <span className="ml-2 font-medium">Frontend</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-green-500 text-2xl">✅</span>
                <span className="ml-2 font-medium">Database</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-green-500 text-2xl">✅</span>
                <span className="ml-2 font-medium">Redis</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-green-500 text-2xl">✅</span>
                <span className="ml-2 font-medium">Storage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
