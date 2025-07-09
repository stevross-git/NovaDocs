import { useState, useEffect, useCallback } from 'react'
import { Folder, FolderPage } from '@/types'

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'my-docs', name: 'My Documents', pages: [] },
  { id: 'shared', name: 'Shared', pages: [] },
  { id: 'archive', name: 'Archive', pages: [] }
]

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([])

  // load folders from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('novadocs.folders')
    if (raw) {
      try {
        setFolders(JSON.parse(raw))
      } catch {
        setFolders(DEFAULT_FOLDERS)
      }
    } else {
      setFolders(DEFAULT_FOLDERS)
    }
  }, [])

  // persist folders
  useEffect(() => {
    localStorage.setItem('novadocs.folders', JSON.stringify(folders))
  }, [folders])

  const addPageToFolder = useCallback((folderId: string, page: FolderPage) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f
        const exists = f.pages.find((p) => p.id === page.id)
        const pages = exists
          ? f.pages.map((p) => (p.id === page.id ? page : p))
          : [...f.pages, page]
        return { ...f, pages }
      })
    )
  }, [])

  const renameFolder = useCallback((folderId: string, name: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name } : f))
    )
  }, [])

  return { folders, addPageToFolder, renameFolder }
}
