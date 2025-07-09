"""
GraphQL schema for NovaDocs API using Strawberry.
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
import strawberry
from strawberry.types import Info

from src.core.models import (
    User as UserModel,
    Workspace as WorkspaceModel,
    Page as PageModel,
    Block as BlockModel,
    Database as DatabaseModel,
    DatabaseRow as DatabaseRowModel,
    Permission as PermissionModel,
    Comment as CommentModel,
)
from src.core.database import get_db
from src.core.auth.dependencies import get_current_user
from src.api.graphql.types import (
    User, Workspace, Page, Block, Database, DatabaseRow, 
    Permission, Comment, ShareLink
)
from src.api.graphql.inputs import (
    CreateWorkspaceInput, UpdateWorkspaceInput,
    CreatePageInput, UpdatePageInput,
    CreateBlockInput, UpdateBlockInput,
    CreateDatabaseInput, UpdateDatabaseInput,
    CreateDatabaseRowInput, UpdateDatabaseRowInput,
    CreateCommentInput, UpdateCommentInput,
    GrantPermissionInput, CreateShareLinkInput
)
from src.core.services.workspace import WorkspaceService
from src.core.services.page import PageService
from src.core.services.block import BlockService
from src.core.services.database import DatabaseService
from src.core.services.comment import CommentService
from src.core.services.permission import PermissionService
from src.core.services.search import SearchService
from src.core.exceptions import NotFoundError, PermissionError


@strawberry.type
class Query:
    """GraphQL Query root."""
    
    @strawberry.field
    async def me(self, info: Info) -> Optional[User]:
        """Get current user."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            return None
        return User.from_model(current_user)
    
    @strawberry.field
    async def workspace(self, slug: str, info: Info) -> Optional[Workspace]:
        """Get workspace by slug."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            workspace_service = WorkspaceService(db)
            workspace = await workspace_service.get_by_slug(slug, current_user.id)
            
            if not workspace:
                return None
            
            return Workspace.from_model(workspace)
    
    @strawberry.field
    async def page(self, id: uuid.UUID, info: Info) -> Optional[Page]:
        """Get page by ID."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            page_service = PageService(db)
            page = await page_service.get_by_id(id, current_user.id)
            
            if not page:
                return None
            
            return Page.from_model(page)
    
    @strawberry.field
    async def search_pages(
        self, 
        query: str, 
        workspace_id: uuid.UUID, 
        info: Info
    ) -> List[Page]:
        """Search pages by query."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            search_service = SearchService(db)
            pages = await search_service.search_pages(
                query, workspace_id, current_user.id
            )
            
            return [Page.from_model(page) for page in pages]
    
    @strawberry.field
    async def search_blocks(
        self, 
        query: str, 
        workspace_id: uuid.UUID, 
        info: Info
    ) -> List[Block]:
        """Search blocks by query."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            search_service = SearchService(db)
            blocks = await search_service.search_blocks(
                query, workspace_id, current_user.id
            )
            
            return [Block.from_model(block) for block in blocks]


@strawberry.type
class Mutation:
    """GraphQL Mutation root."""
    
    # Workspace mutations
    @strawberry.field
    async def create_workspace(
        self, 
        input: CreateWorkspaceInput, 
        info: Info
    ) -> Workspace:
        """Create a new workspace."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            workspace_service = WorkspaceService(db)
            workspace = await workspace_service.create(
                name=input.name,
                slug=input.slug,
                description=input.description,
                settings=input.settings or {},
                owner_id=current_user.id
            )
            
            return Workspace.from_model(workspace)
    
    @strawberry.field
    async def update_workspace(
        self, 
        id: uuid.UUID, 
        input: UpdateWorkspaceInput, 
        info: Info
    ) -> Workspace:
        """Update workspace."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            workspace_service = WorkspaceService(db)
            workspace = await workspace_service.update(
                id, current_user.id, **input.__dict__
            )
            
            return Workspace.from_model(workspace)
    
    @strawberry.field
    async def delete_workspace(self, id: uuid.UUID, info: Info) -> bool:
        """Delete workspace."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            workspace_service = WorkspaceService(db)
            await workspace_service.delete(id, current_user.id)
            
            return True
    
    # Page mutations
    @strawberry.field
    async def create_page(self, input: CreatePageInput, info: Info) -> Page:
        """Create a new page."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            page_service = PageService(db)
            page = await page_service.create(
                title=input.title,
                workspace_id=input.workspace_id,
                parent_id=input.parent_id,
                position=input.position or 0,
                is_template=input.is_template or False,
                created_by_id=current_user.id
            )
            
            return Page.from_model(page)
    
    @strawberry.field
    async def update_page(
        self, 
        id: uuid.UUID, 
        input: UpdatePageInput, 
        info: Info
    ) -> Page:
        """Update page."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            page_service = PageService(db)
            page = await page_service.update(
                id, current_user.id, **input.__dict__
            )
            
            return Page.from_model(page)
    
    @strawberry.field
    async def delete_page(self, id: uuid.UUID, info: Info) -> bool:
        """Delete page."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            page_service = PageService(db)
            await page_service.delete(id, current_user.id)
            
            return True
    
    @strawberry.field
    async def move_page(
        self, 
        id: uuid.UUID, 
        parent_id: Optional[uuid.UUID], 
        position: int, 
        info: Info
    ) -> Page:
        """Move page to new parent and position."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            page_service = PageService(db)
            page = await page_service.move(
                id, parent_id, position, current_user.id
            )
            
            return Page.from_model(page)
    
    # Block mutations
    @strawberry.field
    async def create_block(self, input: CreateBlockInput, info: Info) -> Block:
        """Create a new block."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            block_service = BlockService(db)
            block = await block_service.create(
                page_id=input.page_id,
                type=input.type,
                data=input.data,
                properties=input.properties or {},
                position=input.position,
                parent_block_id=input.parent_block_id,
                user_id=current_user.id
            )
            
            return Block.from_model(block)
    
    @strawberry.field
    async def update_block(
        self, 
        id: uuid.UUID, 
        input: UpdateBlockInput, 
        info: Info
    ) -> Block:
        """Update block."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            block_service = BlockService(db)
            block = await block_service.update(
                id, current_user.id, **input.__dict__
            )
            
            return Block.from_model(block)
    
    @strawberry.field
    async def delete_block(self, id: uuid.UUID, info: Info) -> bool:
        """Delete block."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            block_service = BlockService(db)
            await block_service.delete(id, current_user.id)
            
            return True
    
    # Database mutations
    @strawberry.field
    async def create_database(
        self, 
        input: CreateDatabaseInput, 
        info: Info
    ) -> Database:
        """Create a new database."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            database_service = DatabaseService(db)
            database = await database_service.create(
                page_id=input.page_id,
                name=input.name,
                schema=input.schema,
                views=input.views or [],
                user_id=current_user.id
            )
            
            return Database.from_model(database)
    
    @strawberry.field
    async def update_database(
        self, 
        id: uuid.UUID, 
        input: UpdateDatabaseInput, 
        info: Info
    ) -> Database:
        """Update database."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            database_service = DatabaseService(db)
            database = await database_service.update(
                id, current_user.id, **input.__dict__
            )
            
            return Database.from_model(database)
    
    # Database row mutations
    @strawberry.field
    async def create_database_row(
        self, 
        input: CreateDatabaseRowInput, 
        info: Info
    ) -> DatabaseRow:
        """Create a new database row."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            database_service = DatabaseService(db)
            row = await database_service.create_row(
                database_id=input.database_id,
                data=input.data,
                position=input.position or 0,
                user_id=current_user.id
            )
            
            return DatabaseRow.from_model(row)
    
    @strawberry.field
    async def update_database_row(
        self, 
        id: uuid.UUID, 
        input: UpdateDatabaseRowInput, 
        info: Info
    ) -> DatabaseRow:
        """Update database row."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            database_service = DatabaseService(db)
            row = await database_service.update_row(
                id, current_user.id, **input.__dict__
            )
            
            return DatabaseRow.from_model(row)
    
    @strawberry.field
    async def delete_database_row(self, id: uuid.UUID, info: Info) -> bool:
        """Delete database row."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            database_service = DatabaseService(db)
            await database_service.delete_row(id, current_user.id)
            
            return True
    
    # Comment mutations
    @strawberry.field
    async def create_comment(
        self, 
        input: CreateCommentInput, 
        info: Info
    ) -> Comment:
        """Create a new comment."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            comment_service = CommentService(db)
            comment = await comment_service.create(
                page_id=input.page_id,
                block_id=input.block_id,
                content=input.content,
                metadata=input.metadata or {},
                user_id=current_user.id
            )
            
            return Comment.from_model(comment)
    
    @strawberry.field
    async def update_comment(
        self, 
        id: uuid.UUID, 
        input: UpdateCommentInput, 
        info: Info
    ) -> Comment:
        """Update comment."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            comment_service = CommentService(db)
            comment = await comment_service.update(
                id, current_user.id, **input.__dict__
            )
            
            return Comment.from_model(comment)
    
    @strawberry.field
    async def delete_comment(self, id: uuid.UUID, info: Info) -> bool:
        """Delete comment."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            comment_service = CommentService(db)
            await comment_service.delete(id, current_user.id)
            
            return True
    
    # Permission mutations
    @strawberry.field
    async def grant_permission(
        self, 
        input: GrantPermissionInput, 
        info: Info
    ) -> Permission:
        """Grant permission to user."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            permission_service = PermissionService(db)
            permission = await permission_service.grant(
                resource_id=input.resource_id,
                resource_type=input.resource_type,
                user_id=input.user_id,
                workspace_id=input.workspace_id,
                permission_type=input.permission_type,
                conditions=input.conditions or {},
                granted_by_id=current_user.id
            )
            
            return Permission.from_model(permission)
    
    @strawberry.field
    async def revoke_permission(self, id: uuid.UUID, info: Info) -> bool:
        """Revoke permission."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            permission_service = PermissionService(db)
            await permission_service.revoke(id, current_user.id)
            
            return True
    
    # Share link mutations
    @strawberry.field
    async def create_share_link(
        self, 
        input: CreateShareLinkInput, 
        info: Info
    ) -> ShareLink:
        """Create share link."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        async with get_db() as db:
            permission_service = PermissionService(db)
            share_link = await permission_service.create_share_link(
                resource_id=input.resource_id,
                resource_type=input.resource_type,
                permissions=input.permissions,
                expires_at=input.expires_at,
                created_by_id=current_user.id
            )
            
            return ShareLink.from_model(share_link)


@strawberry.type
class Subscription:
    """GraphQL Subscription root."""
    
    @strawberry.subscription
    async def page_updated(self, page_id: uuid.UUID, info: Info) -> Page:
        """Subscribe to page updates."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        # Implementation would use Redis pub/sub or WebSocket
        # This is a placeholder for the subscription logic
        yield Page(id=page_id, title="Updated Page", slug="updated")
    
    @strawberry.subscription
    async def block_updated(self, page_id: uuid.UUID, info: Info) -> Block:
        """Subscribe to block updates."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        # Implementation would use Redis pub/sub or WebSocket
        # This is a placeholder for the subscription logic
        yield Block(id=uuid.uuid4(), type="paragraph", data={}, position=0)
    
    @strawberry.subscription
    async def comment_added(self, page_id: uuid.UUID, info: Info) -> Comment:
        """Subscribe to new comments."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        # Implementation would use Redis pub/sub or WebSocket
        # This is a placeholder for the subscription logic
        yield Comment(
            id=uuid.uuid4(), 
            content="New comment", 
            created_at=datetime.now()
        )
    
    @strawberry.subscription
    async def cursor_update(self, page_id: uuid.UUID, info: Info) -> "CursorUpdate":
        """Subscribe to cursor updates."""
        current_user = await get_current_user(info.context["request"])
        if not current_user:
            raise PermissionError("Authentication required")
        
        # Implementation would use WebSocket for real-time cursor updates
        # This is a placeholder for the subscription logic
        yield CursorUpdate(
            user_id=current_user.id,
            page_id=page_id,
            position=0,
            selection={}
        )


@strawberry.type
class CursorUpdate:
    """Cursor update for real-time collaboration."""
    
    user_id: uuid.UUID
    page_id: uuid.UUID
    position: int
    selection: Dict[str, Any]


# Create the schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription,
)