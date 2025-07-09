'use client'

import { useState } from 'react'
import { Search, Clock, FileText } from 'lucide-react'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const mockResults = [
    { id: 1, title: 'Getting Started Guide', content: 'Learn how to get started with NovaDocs...', updated: '2 hours ago' },
    { id: 2, title: 'API Documentation', content: 'Complete API reference for developers...', updated: '1 day ago' },
    { id: 3, title: 'Team Guidelines', content: 'Best practices for team collaboration...', updated: '3 days ago' },
  ]

  const handleSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      const filtered = mockResults.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.content.toLowerCase().includes(query.toLowerCase())
      )
      setResults(filtered)
      setLoading(false)
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Search</h1>
      </div>
      
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, content, and more..."
              className="w-full pl-10 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Searching...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{results.length} results found</p>
            {results.map((result) => (
              <div key={result.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-blue-500 mt-1 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{result.title}</h3>
                    <p className="text-gray-600 mb-3">{result.content}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      Updated {result.updated}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {query && results.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-600">No results found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  )
}
