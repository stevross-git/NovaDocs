#!/bin/bash
echo "🔍 Checking NovaDocs services..."
echo ""

# PostgreSQL
if docker exec -it novadocs-postgres psql -U novadocs -d novadocs -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Running"
else
    echo "❌ PostgreSQL: Not ready"
fi

# Redis
if docker exec -it novadocs-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: Running"
else
    echo "❌ Redis: Not ready"
fi

# MinIO
if curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "✅ MinIO: Running"
else
    echo "❌ MinIO: Not ready"
fi

echo ""
echo "Services running on:"
echo "�� PostgreSQL: localhost:5432"
echo "🔄 Redis: localhost:6379"
echo "📁 MinIO: localhost:9000 (API) / localhost:9001 (Console)"
