// frontend/src/types/index.ts
export interface User {
  id: string
  email: string
  name: string
  role?: 'super_admin' | 'admin' | 'editor' | 'viewer'
  avatarUrl?: string
  preferences: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  settings: Record<string, any>
  owner: User
  members: WorkspaceMember[]
  pages: Page[]
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  id: string
  user: User
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  joinedAt: string
}

export interface Page {
  id: string
  title: string
  slug: string
  workspace: Workspace
  parent?: Page
  children: Page[]
  createdBy: User
  metadata: Record<string, any>
  contentYjs?: string
  position: number
  isTemplate: boolean
  blocks: Block[]
  permissions: Permission[]
  comments: Comment[]
  createdAt: string
  updatedAt: string
}

export interface Block {
  id: string
  page: Page
  type: string
  data: Record<string, any>
  properties?: Record<string, any>
  position: number
  parentBlock?: Block
  childBlocks: Block[]
  comments: Comment[]
  createdAt: string
  updatedAt: string
}

export interface Database {
  id: string
  page: Page
  name: string
  schema: Record<string, any>
  views: Array<Record<string, any>>
  rows: DatabaseRow[]
  createdAt: string
  updatedAt: string
}

export interface DatabaseRow {
  id: string
  database: Database
  data: Record<string, any>
  position: number
  createdAt: string
  updatedAt: string
}

export interface Permission {
  id: string
  resourceId: string
  resourceType: string
  user?: User
  workspace: Workspace
  permissionType: string
  conditions: Record<string, any>
  createdAt: string
}

export interface Comment {
  id: string
  page?: Page
  block?: Block
  user: User
  content: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ShareLink {
  id: string
  token: string
  resourceId: string
  resourceType: string
  permissions: Record<string, any>
  expiresAt?: string
  createdAt: string
}

// Input types for mutations
export interface UpdatePageInput {
  title?: string
  slug?: string
  metadata?: Record<string, any>
  contentYjs?: string
  position?: number
  isTemplate?: boolean}
export interface FolderPage {
  id: string
  title: string
  href: string
}

export interface Folder {
  id: string
  name: string
  pages: FolderPage[]
}
