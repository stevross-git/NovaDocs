# apps/backend/src/core/services/storage.py
"""Simple MinIO storage service for NovaDocs."""

import uuid
import json
from datetime import datetime
from typing import Optional, Dict, Any

try:
    import boto3
    from botocore.exceptions import ClientError
    from fastapi import UploadFile
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    print("⚠️ boto3 not installed. MinIO storage will not be available.")


class MinIOStorageService:
    """Simple MinIO storage service."""
    
    def __init__(self):
        """Initialize MinIO client."""
        if not BOTO3_AVAILABLE:
            raise ImportError("boto3 is required for MinIO storage. Run: pip install boto3")
        
        # MinIO configuration
        self.config = {
            'endpoint_url': 'http://localhost:9000',
            'aws_access_key_id': 'minioadmin',
            'aws_secret_access_key': 'minioadmin',
            'region_name': 'us-east-1'
        }
        
        self.bucket_name = 'novadocs'
        
        try:
            self.client = boto3.client('s3', **self.config)
            self._ensure_bucket_exists()
            print(f"✅ MinIO storage service initialized (bucket: {self.bucket_name})")
        except Exception as e:
            print(f"⚠️ MinIO initialization failed: {e}")
            raise
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                try:
                    self.client.create_bucket(Bucket=self.bucket_name)
                    print(f"✅ Created MinIO bucket: {self.bucket_name}")
                except ClientError as create_error:
                    print(f"❌ Failed to create bucket {self.bucket_name}: {create_error}")
                    raise
    
    async def store_document(
        self,
        page_id: uuid.UUID,
        content: str,
        title: str,
        version: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Store document content in MinIO."""
        try:
            # Create document object
            document = {
                "page_id": str(page_id),
                "title": title,
                "content": content,
                "version": version,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat(),
                "content_type": "text/markdown"
            }
            
            # Generate storage key
            storage_key = f"documents/{page_id}/v{version}.json"
            
            # Store in MinIO
            document_json = json.dumps(document, ensure_ascii=False, indent=2)
            
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=storage_key,
                Body=document_json.encode('utf-8'),
                ContentType='application/json',
                Metadata={
                    'page-id': str(page_id),
                    'title': title,
                    'version': str(version),
                    'content-length': str(len(content))
                }
            )
            
            return storage_key
            
        except Exception as e:
            print(f"❌ Failed to store document: {e}")
            raise
    
    async def retrieve_document(self, storage_key: str) -> Dict[str, Any]:
        """Retrieve document content from MinIO."""
        try:
            response = self.client.get_object(
                Bucket=self.bucket_name,
                Key=storage_key
            )
            
            content = response['Body'].read().decode('utf-8')
            document = json.loads(content)
            
            return document
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise FileNotFoundError(f"Document not found: {storage_key}")
            raise
        except Exception as e:
            print(f"❌ Failed to retrieve document: {e}")
            raise
    
    async def store_asset(
        self,
        file: UploadFile,
        workspace_id: uuid.UUID,
        uploaded_by_id: uuid.UUID,
        folder: str = "assets"
    ) -> Dict[str, Any]:
        """Store uploaded file in MinIO."""
        try:
            # Generate unique filename
            file_ext = file.filename.split('.')[-1] if file.filename and '.' in file.filename else 'bin'
            unique_filename = f"{uuid.uuid4()}.{file_ext}"
            storage_key = f"{folder}/{workspace_id}/{unique_filename}"
            
            # Read file content
            file_content = await file.read()
            
            # Store in MinIO
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=storage_key,
                Body=file_content,
                ContentType=file.content_type or 'application/octet-stream',
                Metadata={
                    'original-filename': file.filename or 'unknown',
                    'workspace-id': str(workspace_id),
                    'uploaded-by': str(uploaded_by_id),
                    'upload-date': datetime.utcnow().isoformat()
                }
            )
            
            # Generate public URL
            public_url = f"{self.config['endpoint_url']}/{self.bucket_name}/{storage_key}"
            
            return {
                "storage_key": storage_key,
                "original_filename": file.filename,
                "filename": unique_filename,
                "mime_type": file.content_type,
                "size": len(file_content),
                "public_url": public_url,
                "workspace_id": workspace_id,
                "uploaded_by_id": uploaded_by_id
            }
            
        except Exception as e:
            print(f"❌ Failed to store asset: {e}")
            raise
    
    async def get_asset_url(self, storage_key: str, expires_in: int = 3600) -> str:
        """Generate presigned URL for asset access."""
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': storage_key},
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            print(f"❌ Failed to generate asset URL: {e}")
            raise
    
    async def delete_document(self, storage_key: str):
        """Delete document from MinIO."""
        try:
            self.client.delete_object(
                Bucket=self.bucket_name,
                Key=storage_key
            )
        except Exception as e:
            print(f"❌ Failed to delete document: {e}")
            raise
    
    async def backup_document(self, page_id: uuid.UUID, content: str, title: str):
        """Create backup of document content."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_key = f"backups/{page_id}/{timestamp}.json"
        
        backup_data = {
            "page_id": str(page_id),
            "title": title,
            "content": content,
            "backup_date": datetime.utcnow().isoformat(),
            "type": "backup"
        }
        
        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=backup_key,
                Body=json.dumps(backup_data, ensure_ascii=False, indent=2).encode('utf-8'),
                ContentType='application/json',
                Metadata={
                    'page-id': str(page_id),
                    'backup-date': timestamp,
                    'type': 'backup'
                }
            )
            return backup_key
        except Exception as e:
            print(f"❌ Failed to create backup: {e}")
            raise