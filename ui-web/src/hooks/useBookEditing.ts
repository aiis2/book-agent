import { useCallback, useEffect, useState } from 'react'
import { Form, message } from 'antd'
import {
  createBook,
  createChapter,
  exportBook,
  replaceCharacters,
  replaceRelationships,
  replaceZepGraph,
  reviseChapter,
  updateBookMetadata,
} from '../api'
import type {
  BookDetail,
  CharacterFormValues,
  CharacterProfile,
  ChapterRecord,
  Relationship,
  RelationshipFormValues,
} from '../types'

export interface BookEditingState {
  // Modals open flags
  createOpen: boolean
  metadataOpen: boolean
  chapterOpen: boolean
  characterOpen: boolean
  relationshipOpen: boolean
  // Editing entities
  chapterPreview: ChapterRecord | undefined
  editingChapter: ChapterRecord | undefined
  editingCharacter: CharacterProfile | undefined
  editingRelationship: Relationship | undefined
  // Form instances
  createForm: ReturnType<typeof Form.useForm>[0]
  metadataForm: ReturnType<typeof Form.useForm>[0]
  chapterForm: ReturnType<typeof Form.useForm>[0]
  characterForm: ReturnType<typeof Form.useForm<CharacterFormValues>>[0]
  relationshipForm: ReturnType<typeof Form.useForm<RelationshipFormValues>>[0]
  // Message context holder (must be rendered in the component tree)
  messageContextHolder: React.ReactNode
  // Setters
  setCreateOpen: (v: boolean) => void
  setMetadataOpen: (v: boolean) => void
  setChapterOpen: (v: boolean) => void
  setCharacterOpen: (v: boolean) => void
  setRelationshipOpen: (v: boolean) => void
  setChapterPreview: (c: ChapterRecord | undefined) => void
  // Actions
  openChapterEditor: (chapter?: ChapterRecord) => void
  openCharacterEditor: (character?: CharacterProfile) => void
  openRelationshipEditor: (relationship?: Relationship) => void
  handleCreateBook: (
    values: Record<string, unknown>,
    onSuccess: (bookId: string) => Promise<void>,
  ) => Promise<void>
  handleSaveMetadata: (
    values: Record<string, unknown>,
    bookId: string,
    onSuccess: (detail: BookDetail) => void,
    onRefresh: () => Promise<void>,
  ) => Promise<void>
  handleSaveChapter: (
    values: Record<string, unknown>,
    bookId: string,
    onRefresh: () => Promise<void>,
  ) => Promise<void>
  handleSaveCharacter: (
    values: CharacterFormValues,
    bookId: string,
    detail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => Promise<void>
  handleDeleteCharacter: (
    characterId: string,
    bookId: string,
    detail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => Promise<void>
  handleSaveRelationship: (
    values: RelationshipFormValues,
    bookId: string,
    detail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => Promise<void>
  handleDeleteRelationship: (
    relationshipId: string,
    bookId: string,
    detail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => Promise<void>
  handleSaveZepGraph: (
    zepDraft: string,
    bookId: string,
    detail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => Promise<void>
  handleExportBook: (bookId: string) => Promise<void>
}

export function useBookEditing(detail: BookDetail | undefined): BookEditingState {
  const [messageApi, contextHolder] = message.useMessage()

  const [createOpen, setCreateOpen] = useState(false)
  const [metadataOpen, setMetadataOpen] = useState(false)
  const [chapterOpen, setChapterOpen] = useState(false)
  const [characterOpen, setCharacterOpen] = useState(false)
  const [relationshipOpen, setRelationshipOpen] = useState(false)

  const [chapterPreview, setChapterPreview] = useState<ChapterRecord>()
  const [editingChapter, setEditingChapter] = useState<ChapterRecord>()
  const [editingCharacter, setEditingCharacter] = useState<CharacterProfile>()
  const [editingRelationship, setEditingRelationship] = useState<Relationship>()

  const [createForm] = Form.useForm()
  const [metadataForm] = Form.useForm()
  const [chapterForm] = Form.useForm()
  const [characterForm] = Form.useForm<CharacterFormValues>()
  const [relationshipForm] = Form.useForm<RelationshipFormValues>()

  // Sync metadata form when detail changes
  useEffect(() => {
    if (!detail) return
    metadataForm.setFieldsValue({
      ...detail.book,
      authorIntent: detail.authorIntent,
      currentFocus: detail.currentFocus,
    })
  }, [detail, metadataForm])

  const openChapterEditor = useCallback((chapter?: ChapterRecord) => {
    setEditingChapter(chapter)
    setChapterOpen(true)
    chapterForm.setFieldsValue(
      chapter
        ? { title: chapter.title, summary: chapter.summary, revisedContent: chapter.content }
        : { title: '', summary: '', content: '' },
    )
  }, [chapterForm])

  const openCharacterEditor = useCallback((character?: CharacterProfile) => {
    setEditingCharacter(character)
    setCharacterOpen(true)
    characterForm.setFieldsValue(
      character
        ? { ...character, traitsText: character.traits.join(', '), aliasesText: character.aliases.join(', ') }
        : { id: '', name: '', role: 'character', summary: '', biography: '', traitsText: '', aliasesText: '', notes: '' },
    )
  }, [characterForm])

  const openRelationshipEditor = useCallback((relationship?: Relationship) => {
    setEditingRelationship(relationship)
    setRelationshipOpen(true)
    relationshipForm.setFieldsValue(
      relationship ?? {
        id: '', fromCharacterId: '', toCharacterId: '', type: 'other',
        label: '', summary: '', strength: 0.5,
      },
    )
  }, [relationshipForm])

  const handleCreateBook = useCallback(async (
    values: Record<string, unknown>,
    onSuccess: (bookId: string) => Promise<void>,
  ) => {
    const created = await createBook(values)
    setCreateOpen(false)
    createForm.resetFields()
    await onSuccess(created.book.id)
    messageApi.success('Novel created.')
  }, [createForm, messageApi])

  const handleSaveMetadata = useCallback(async (
    values: Record<string, unknown>,
    bookId: string,
    onSuccess: (detail: BookDetail) => void,
    onRefresh: () => Promise<void>,
  ) => {
    const nextDetail = await updateBookMetadata(bookId, values)
    onSuccess(nextDetail)
    setMetadataOpen(false)
    await onRefresh()
    messageApi.success('Metadata updated.')
  }, [messageApi])

  const handleSaveChapter = useCallback(async (
    values: Record<string, unknown>,
    bookId: string,
    onRefresh: () => Promise<void>,
  ) => {
    if (editingChapter) {
      await reviseChapter(bookId, editingChapter.id, values)
      messageApi.success('Chapter revised.')
    } else {
      await createChapter(bookId, values)
      messageApi.success('Chapter created.')
    }
    setChapterOpen(false)
    setEditingChapter(undefined)
    chapterForm.resetFields()
    await onRefresh()
  }, [editingChapter, chapterForm, messageApi])

  const handleSaveCharacter = useCallback(async (
    values: CharacterFormValues,
    bookId: string,
    currentDetail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => {
    const nextCharacter: CharacterProfile = {
      id: values.id || editingCharacter?.id || `character-${Date.now().toString(36)}`,
      name: values.name,
      role: values.role,
      summary: values.summary,
      biography: values.biography,
      traits: values.traitsText?.split(',').map((v) => v.trim()).filter(Boolean) ?? [],
      aliases: values.aliasesText?.split(',').map((v) => v.trim()).filter(Boolean) ?? [],
      notes: values.notes,
      createdAt: editingCharacter?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const nextList = editingCharacter
      ? currentDetail.domain.characters.map((c) => (c.id === editingCharacter.id ? nextCharacter : c))
      : [...currentDetail.domain.characters, nextCharacter]
    const domain = await replaceCharacters(bookId, nextList)
    onUpdate(domain)
    setCharacterOpen(false)
    setEditingCharacter(undefined)
    characterForm.resetFields()
    await onRefresh()
    messageApi.success('Character profiles saved.')
  }, [editingCharacter, characterForm, messageApi])

  const handleDeleteCharacter = useCallback(async (
    characterId: string,
    bookId: string,
    currentDetail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => {
    const domain = await replaceCharacters(
      bookId,
      currentDetail.domain.characters.filter((c) => c.id !== characterId),
    )
    onUpdate(domain)
    await onRefresh()
    messageApi.success('Character removed.')
  }, [messageApi])

  const handleSaveRelationship = useCallback(async (
    values: RelationshipFormValues,
    bookId: string,
    currentDetail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => {
    const nextRel: Relationship = {
      ...values,
      id: values.id || editingRelationship?.id || `relationship-${Date.now().toString(36)}`,
      createdAt: editingRelationship?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const nextList = editingRelationship
      ? currentDetail.domain.relationships.map((r) => (r.id === editingRelationship.id ? nextRel : r))
      : [...currentDetail.domain.relationships, nextRel]
    const domain = await replaceRelationships(bookId, nextList)
    onUpdate(domain)
    setRelationshipOpen(false)
    setEditingRelationship(undefined)
    relationshipForm.resetFields()
    await onRefresh()
    messageApi.success('Relationship graph saved.')
  }, [editingRelationship, relationshipForm, messageApi])

  const handleDeleteRelationship = useCallback(async (
    relationshipId: string,
    bookId: string,
    currentDetail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => {
    const domain = await replaceRelationships(
      bookId,
      currentDetail.domain.relationships.filter((r) => r.id !== relationshipId),
    )
    onUpdate(domain)
    await onRefresh()
    messageApi.success('Relationship removed.')
  }, [messageApi])

  const handleSaveZepGraph = useCallback(async (
    zepDraft: string,
    bookId: string,
    _currentDetail: BookDetail,
    onUpdate: (domain: BookDetail['domain']) => void,
    onRefresh: () => Promise<void>,
  ) => {
    const parsed = JSON.parse(zepDraft)
    const domain = await replaceZepGraph(bookId, parsed)
    onUpdate(domain)
    await onRefresh()
    messageApi.success('Zep graph saved.')
  }, [messageApi])

  const handleExportBook = useCallback(async (bookId: string) => {
    await exportBook(bookId)
    messageApi.success('Export completed.')
  }, [messageApi])

  // Expose contextHolder so App can render it
  return {
    createOpen, metadataOpen, chapterOpen, characterOpen, relationshipOpen,
    chapterPreview, editingChapter, editingCharacter, editingRelationship,
    createForm, metadataForm, chapterForm, characterForm, relationshipForm,
    messageContextHolder: contextHolder,
    setCreateOpen, setMetadataOpen, setChapterOpen, setCharacterOpen,
    setRelationshipOpen, setChapterPreview,
    openChapterEditor, openCharacterEditor, openRelationshipEditor,
    handleCreateBook, handleSaveMetadata, handleSaveChapter,
    handleSaveCharacter, handleDeleteCharacter,
    handleSaveRelationship, handleDeleteRelationship,
    handleSaveZepGraph, handleExportBook,
  }
}
