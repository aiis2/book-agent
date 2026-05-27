import { useCallback, useEffect, useState } from 'react'
import { getBookDetail, listBooks } from '../api'
import type { BookDetail, BookSummary } from '../types'

export interface BookCatalogState {
  books: BookSummary[]
  selectedBookId: string | undefined
  detail: BookDetail | undefined
  loading: boolean
  detailLoading: boolean
  zepDraft: string
  setSelectedBookId: (id: string) => void
  setZepDraft: (draft: string) => void
  setDetail: React.Dispatch<React.SetStateAction<BookDetail | undefined>>
  refreshBooks: (nextBookId?: string) => Promise<void>
  refreshDetail: (bookId: string) => Promise<void>
}

const DEFAULT_ZEP_DRAFT = '{\n  "schemaVersion": 1,\n  "episodes": [],\n  "entities": [],\n  "facts": []\n}'

export function useBookCatalog(): BookCatalogState {
  const [books, setBooks] = useState<BookSummary[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string>()
  const [detail, setDetail] = useState<BookDetail>()
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [zepDraft, setZepDraft] = useState(DEFAULT_ZEP_DRAFT)

  const refreshBooks = useCallback(async (nextBookId?: string) => {
    setLoading(true)
    try {
      const { books: nextBooks } = await listBooks()
      setBooks(nextBooks)
      const candidateId = nextBookId ?? selectedBookId ?? nextBooks[0]?.id
      if (candidateId) {
        setSelectedBookId(candidateId)
      } else {
        setDetail(undefined)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedBookId])

  const refreshDetail = useCallback(async (bookId: string) => {
    setDetailLoading(true)
    try {
      const nextDetail = await getBookDetail(bookId)
      setDetail(nextDetail)
      setZepDraft(JSON.stringify(nextDetail.domain.zepGraph, null, 2))
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Initial book list load
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      setLoading(true)
      try {
        const { books: nextBooks } = await listBooks()
        if (cancelled) return
        setBooks(nextBooks)
        if (nextBooks.length === 0) {
          setSelectedBookId(undefined)
          setDetail(undefined)
          return
        }
        setSelectedBookId((current) => (
          current && nextBooks.some((b) => b.id === current) ? current : nextBooks[0].id
        ))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void bootstrap()
    return () => { cancelled = true }
  }, [])

  // Load detail whenever selectedBookId changes
  useEffect(() => {
    if (!selectedBookId) return
    const bookId = selectedBookId
    let cancelled = false

    async function loadDetail() {
      setDetailLoading(true)
      try {
        const nextDetail = await getBookDetail(bookId)
        if (cancelled) return
        setDetail(nextDetail)
        setZepDraft(JSON.stringify(nextDetail.domain.zepGraph, null, 2))
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    void loadDetail()
    return () => { cancelled = true }
  }, [selectedBookId])

  return {
    books,
    selectedBookId,
    detail,
    loading,
    detailLoading,
    zepDraft,
    setSelectedBookId,
    setZepDraft,
    setDetail,
    refreshBooks,
    refreshDetail,
  }
}
