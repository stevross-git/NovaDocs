import os
from typing import Optional
import httpx


class NotionService:
    """Simple wrapper around Notion API for creating pages."""

    def __init__(self, token: Optional[str] = None, parent_page_id: Optional[str] = None):
        self.token = token or os.getenv("NOTION_API_TOKEN")
        self.parent_page_id = parent_page_id or os.getenv("NOTION_PARENT_PAGE_ID")
        self.base_url = "https://api.notion.com/v1"
        self.notion_version = "2022-06-28"

    async def create_page(self, title: str, content: str) -> Optional[str]:
        """Create a page in Notion. Returns the new page ID on success."""
        if not self.token or not self.parent_page_id:
            return None

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Notion-Version": self.notion_version,
            "Content-Type": "application/json",
        }
        payload = {
            "parent": {"page_id": self.parent_page_id},
            "properties": {
                "title": {
                    "title": [
                        {
                            "type": "text",
                            "text": {"content": title},
                        }
                    ]
                }
            },
            "children": [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {"content": content},
                            }
                        ]
                    },
                }
            ],
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{self.base_url}/pages", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("id")

    async def update_page(self, page_id: str, title: Optional[str] = None, content: Optional[str] = None) -> None:
        """Update a Notion page's title and append content."""
        if not self.token:
            return None

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Notion-Version": self.notion_version,
            "Content-Type": "application/json",
        }

        if title:
            payload = {
                "properties": {
                    "title": {"title": [{"type": "text", "text": {"content": title}}]}
                }
            }
            async with httpx.AsyncClient() as client:
                await client.patch(f"{self.base_url}/pages/{page_id}", headers=headers, json=payload)

        if content:
            append_payload = {
                "children": [
                    {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": content}}]}}
                ]
            }
            async with httpx.AsyncClient() as client:
                await client.patch(f"{self.base_url}/blocks/{page_id}/children", headers=headers, json=append_payload)
