# NovaDocs - Modern Collaborative Wiki Platform

A modern, self-hosted collaborative wiki platform built with Next.js, FastAPI, and PostgreSQL.

## Features

- 📝 Rich text editing with real-time collaboration
- 🗂️ Hierarchical pages with infinite nesting
- 📊 Database views (Table, Kanban, Calendar)
- 🔍 Full-text and semantic search
- 🔒 Role-based permissions
- 👥 User management interface
- 📱 Mobile-responsive design
- 🚀 Fast and scalable architecture
- 💾 Pages stored in MinIO with optional Notion sync
- 🏢 Create workspaces with optional Notion sync
- 🔄 Update pages in Notion when enabled
- 🔗 Share pages via unique links
- 💬 Comment on pages for collaboration
- ⭐ Mark pages as favorites

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd novadocs
npm install

# Start development environment
npm run docker:dev
npm run dev
```

## Development

- Frontend: http://localhost:3000
- Users page: http://localhost:3000/users
- Backend API: http://localhost:8000
- GraphQL Playground: http://localhost:8000/graphql
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Development Guide](docs/development.md)
- [Deployment Guide](docs/deployment.md)
- [API Reference](docs/api.md)
