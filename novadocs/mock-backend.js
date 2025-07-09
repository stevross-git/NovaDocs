const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Mock data storage
let pages = [];
let currentId = 1;

// Health check endpoints
const healthResponse = {
  status: 'healthy', 
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  services: {
    database: 'healthy',
    redis: 'healthy',
    storage: 'healthy'
  }
};

app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json(healthResponse);
});

app.get('/api/health', (req, res) => {
  console.log('✅ API Health check requested');
  res.json(healthResponse);
});

app.get('/api/v1/health', (req, res) => {
  console.log('✅ API v1 Health check requested');
  res.json(healthResponse);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'NovaDocs API',
    version: '1.0.0',
    docs: '/docs',
    graphql: '/graphql'
  });
});

// Mock GraphQL endpoint
app.post('/graphql', (req, res) => {
  console.log('📡 GraphQL query:', req.body);
  res.json({ 
    data: { 
      me: { 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com' 
      } 
    } 
  });
});

// Pages API
app.get('/api/v1/pages', (req, res) => {
  console.log('📄 Getting all pages');
  res.json({ pages });
});

app.post('/api/v1/pages', (req, res) => {
  console.log('📄 Creating new page:', req.body);
  const page = {
    id: currentId++,
    title: req.body.title,
    content: req.body.content,
    workspace_id: req.body.workspace_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  pages.push(page);
  res.json({ page, message: 'Page created successfully' });
});

app.get('/api/v1/pages/:id', (req, res) => {
  console.log('📄 Getting page:', req.params.id);
  const page = pages.find(p => p.id == req.params.id);
  if (page) {
    res.json({ page });
  } else {
    res.status(404).json({ error: 'Page not found' });
  }
});

// File upload endpoint
app.post('/api/v1/upload', (req, res) => {
  console.log('📁 File upload requested');
  res.json({ 
    id: 'mock-file-id',
    filename: 'test-file.txt',
    url: '/uploads/test-file.txt',
    size: 1024
  });
});

// Stats endpoint
app.get('/api/v1/stats', (req, res) => {
  res.json({
    pages: pages.length,
    users: 3,
    workspaces: 1,
    storage_used: '12.5 MB'
  });
});

app.listen(8000, () => {
  console.log('🚀 Mock NovaDocs API running on http://localhost:8000');
  console.log('📊 Health check: http://localhost:8000/health');
  console.log('📊 API Health check: http://localhost:8000/api/health');
  console.log('🎯 GraphQL: http://localhost:8000/graphql');
  console.log('📄 Pages API: http://localhost:8000/api/v1/pages');
});
