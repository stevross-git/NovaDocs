#!/usr/bin/env python3
"""Simple MinIO setup script for NovaDocs."""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add the backend source to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("❌ boto3 not installed. Please run: pip install boto3")
    sys.exit(1)


def test_minio_connection():
    """Test MinIO connection."""
    print("🗄️ Testing MinIO connection...")
    
    # MinIO connection settings
    minio_config = {
        'endpoint_url': 'http://localhost:9000',
        'aws_access_key_id': 'minioadmin',
        'aws_secret_access_key': 'minioadmin',
        'region_name': 'us-east-1'
    }
    
    try:
        # Create S3 client
        client = boto3.client('s3', **minio_config)
        
        # Test connection by listing buckets
        response = client.list_buckets()
        print(f"✅ MinIO connection successful! Found {len(response['Buckets'])} buckets")
        
        # Check/create novadocs bucket
        bucket_name = 'novadocs'
        bucket_exists = any(bucket['Name'] == bucket_name for bucket in response['Buckets'])
        
        if not bucket_exists:
            print(f"📦 Creating bucket '{bucket_name}'...")
            client.create_bucket(Bucket=bucket_name)
            print(f"✅ Created bucket '{bucket_name}'")
        else:
            print(f"✅ Bucket '{bucket_name}' already exists")
        
        # Test document storage
        print("📝 Testing document storage...")
        test_doc = {
            "page_id": "test-page-123",
            "title": "Test Document",
            "content": "# Test Document\n\nThis is a test document for MinIO integration.",
            "version": 1,
            "created_at": datetime.utcnow().isoformat(),
            "content_type": "text/markdown"
        }
        
        storage_key = "documents/test-page-123/v1.json"
        
        # Store test document
        client.put_object(
            Bucket=bucket_name,
            Key=storage_key,
            Body=json.dumps(test_doc, indent=2).encode('utf-8'),
            ContentType='application/json'
        )
        print(f"✅ Test document stored: {storage_key}")
        
        # Retrieve test document
        response = client.get_object(Bucket=bucket_name, Key=storage_key)
        retrieved_doc = json.loads(response['Body'].read().decode('utf-8'))
        print(f"✅ Test document retrieved: {retrieved_doc['title']}")
        
        # Clean up test document
        client.delete_object(Bucket=bucket_name, Key=storage_key)
        print("✅ Test document cleaned up")
        
        return True, client
        
    except Exception as e:
        print(f"❌ MinIO connection failed: {e}")
        return False, None


def create_sample_documents(client):
    """Create sample documents in MinIO."""
    print("📝 Creating sample documents...")
    
    bucket_name = 'novadocs'
    
    sample_docs = [
        {
            "page_id": "welcome-page",
            "title": "Welcome to NovaDocs with MinIO! 🎉",
            "content": """# Welcome to NovaDocs with MinIO Storage! 🎉

Congratulations! Your NovaDocs instance is now configured with **MinIO object storage**.

## What's New with MinIO Integration

- 📄 **Document Storage**: All page content is stored in MinIO (S3-compatible)
- 🔄 **Version Control**: Multiple document versions with automatic backups
- 📁 **Asset Management**: File uploads are stored in MinIO buckets
- 🚀 **Scalability**: Object storage scales to petabytes
- 🔒 **Reliability**: Built-in redundancy and data protection

## Storage Architecture

```
Frontend → FastAPI → PostgreSQL (metadata) + MinIO (content)
```

Your documents are now stored in the cloud! ☁️""",
            "version": 1,
            "metadata": {"sample": True}
        },
        {
            "page_id": "storage-guide",
            "title": "MinIO Storage Guide",
            "content": """# MinIO Storage Guide

This guide explains how document storage works with MinIO in NovaDocs.

## Benefits

### Performance
- Fast metadata queries from PostgreSQL
- Efficient content delivery from MinIO
- Separate scaling for different data types

### Reliability
- Automatic backups on every edit
- Version history preserved
- Data redundancy in object storage

### Scalability
- No database size limits for content
- Horizontal scaling of object storage
- Cost-effective for large datasets

## Storage Structure

```
novadocs/
├── documents/
│   └── {page-id}/
│       ├── v1.json
│       ├── v2.json
│       └── v3.json
├── page-assets/
│   └── {page-id}/
│       ├── image1.jpg
│       └── document.pdf
└── backups/
    └── {page-id}/
        └── 20250110_120000.json
```

Happy documenting with object storage! 📦""",
            "version": 1,
            "metadata": {"sample": True, "guide": True}
        }
    ]
    
    for doc in sample_docs:
        storage_key = f"documents/{doc['page_id']}/v{doc['version']}.json"
        
        document = {
            "page_id": doc["page_id"],
            "title": doc["title"],
            "content": doc["content"],
            "version": doc["version"],
            "metadata": doc.get("metadata", {}),
            "created_at": datetime.utcnow().isoformat(),
            "content_type": "text/markdown"
        }
        
        try:
            client.put_object(
                Bucket=bucket_name,
                Key=storage_key,
                Body=json.dumps(document, ensure_ascii=False, indent=2).encode('utf-8'),
                ContentType='application/json',
                Metadata={
                    'page-id': doc["page_id"],
                    'title': doc["title"],
                    'version': str(doc["version"])
                }
            )
            print(f"✅ Created: {doc['title']}")
            
        except Exception as e:
            print(f"❌ Failed to create {doc['title']}: {e}")
    
    print("✅ Sample documents created!")


def list_documents(client):
    """List all documents in MinIO."""
    print("\n📋 Documents in MinIO:")
    
    try:
        response = client.list_objects_v2(
            Bucket='novadocs',
            Prefix='documents/'
        )
        
        if 'Contents' in response:
            for obj in response['Contents']:
                # Get metadata
                head_response = client.head_object(
                    Bucket='novadocs',
                    Key=obj['Key']
                )
                
                title = head_response.get('Metadata', {}).get('title', 'Unknown')
                size_kb = obj['Size'] / 1024
                
                print(f"  📄 {title}")
                print(f"     Key: {obj['Key']}")
                print(f"     Size: {size_kb:.1f} KB")
                print(f"     Modified: {obj['LastModified']}")
                print()
        else:
            print("  No documents found")
            
    except Exception as e:
        print(f"❌ Failed to list documents: {e}")


def main():
    """Run MinIO setup."""
    print("🚀 NovaDocs MinIO Storage Setup")
    print("─" * 50)
    
    # Test connection
    success, client = test_minio_connection()
    
    if not success:
        print("\n❌ MinIO setup failed!")
        print("\nTroubleshooting:")
        print("1. Check MinIO is running: docker ps | grep minio")
        print("2. Check MinIO console: http://localhost:9001")
        print("3. Verify credentials: minioadmin/minioadmin")
        return False
    
    # Create sample documents
    create_sample_documents(client)
    
    # List all documents
    list_documents(client)
    
    print("🎉 MinIO setup completed successfully!")
    print("\nNext steps:")
    print("1. Check MinIO console: http://localhost:9001")
    print("2. Login with: minioadmin / minioadmin")
    print("3. Browse the 'novadocs' bucket")
    print("4. Start your FastAPI server and test document storage")
    
    return True


if __name__ == "__main__":
    if main():
        sys.exit(0)
    else:
        sys.exit(1)