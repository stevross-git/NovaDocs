export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to NovaDocs
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A modern collaborative wiki platform for teams
          </p>
          <div className="space-x-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
              Get Started
            </button>
            <button className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-6 rounded-lg border border-gray-300 transition-colors">
              Learn More
            </button>
          </div>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Real-time Collaboration
            </h3>
            <p className="text-gray-600">
              Work together in real-time with CRDT-powered collaborative editing
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Structured Data
            </h3>
            <p className="text-gray-600">
              Create databases with table, kanban, and calendar views
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Powerful Search
            </h3>
            <p className="text-gray-600">
              Full-text and semantic search across all your content
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}