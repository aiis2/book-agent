import { ConfigProvider, theme as antTheme } from 'antd'
import { useState } from 'react'

import { ACCENT } from './constants'
import { useAgentChat } from './hooks/useAgentChat'
import { useBookCatalog } from './hooks/useBookCatalog'
import { useBookEditing } from './hooks/useBookEditing'

import { AgentChatView } from './components/AgentChatView'
import { AppHeader } from './components/AppHeader'
import { BookListPanel } from './components/BookListPanel'
import { ChapterPreviewDrawer } from './components/ChapterPreviewDrawer'
import { NavSidebar } from './components/NavSidebar'
import { CatalogView } from './components/catalog/CatalogView'
import { ChapterModal } from './components/modals/ChapterModal'
import { CharacterModal } from './components/modals/CharacterModal'
import { CreateBookModal } from './components/modals/CreateBookModal'
import { MetadataModal } from './components/modals/MetadataModal'
import { RelationshipModal } from './components/modals/RelationshipModal'

import type { ViewMode } from './types'

export default function App() {
  const [darkMode, setDarkMode] = useState(true)
  const [view, setView] = useState<ViewMode>('catalog')

  const catalog = useBookCatalog()
  const editing = useBookEditing(catalog.detail)
  const chat = useAgentChat()

  const panelBg = darkMode ? '#16161e' : '#ffffff'
  const mainBg = darkMode ? '#0f0f1a' : '#f4f4f8'
  const headerBg = darkMode ? 'rgba(22,22,30,0.92)' : 'rgba(255,255,255,0.92)'
  const panelBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'

  function patchDomain(domain: NonNullable<typeof catalog.detail>['domain']) {
    if (catalog.detail) {
      catalog.setDetail({ ...catalog.detail, domain: { ...catalog.detail.domain, ...domain } })
    }
  }

  async function bookRefresh() {
    if (catalog.selectedBookId) await catalog.refreshBooks(catalog.selectedBookId)
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: ACCENT,
          borderRadius: 8,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      {editing.messageContextHolder}

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: mainBg }}>
        <NavSidebar
          view={view}
          darkMode={darkMode}
          onViewChange={setView}
          onToggleDark={() => setDarkMode((d) => !d)}
        />

        <BookListPanel
          books={catalog.books}
          selectedBookId={catalog.selectedBookId}
          loading={catalog.loading}
          darkMode={darkMode}
          panelBg={panelBg}
          panelBorder={panelBorder}
          textMuted={darkMode ? '#8b8fa8' : '#6b7280'}
          onSelectBook={catalog.setSelectedBookId}
          onCreateNew={() => editing.setCreateOpen(true)}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <AppHeader
            view={view}
            detail={catalog.detail}
            chatMessagesCount={chat.chatMessages.length}
            panelBorder={panelBorder}
            headerBg={headerBg}
            onOpenMetadata={() => editing.setMetadataOpen(true)}
            onRefreshDetail={() => catalog.selectedBookId && void catalog.refreshDetail(catalog.selectedBookId)}
            onExport={() => catalog.selectedBookId && void editing.handleExportBook(catalog.selectedBookId)}
            onClearChat={chat.clearMessages}
          />

          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {view === 'catalog' && (
              <CatalogView
                detail={catalog.detail}
                loading={catalog.loading}
                detailLoading={catalog.detailLoading}
                zepDraft={catalog.zepDraft}
                onZepDraftChange={catalog.setZepDraft}
                onSaveZepGraph={() =>
                  catalog.detail && catalog.selectedBookId &&
                  void editing.handleSaveZepGraph(catalog.zepDraft, catalog.selectedBookId, catalog.detail, patchDomain, bookRefresh)
                }
                onNewChapter={() => editing.openChapterEditor()}
                onPreviewChapter={editing.setChapterPreview}
                onEditChapter={(chapter) => editing.openChapterEditor(chapter)}
                onAddCharacter={() => editing.openCharacterEditor()}
                onEditCharacter={(character) => editing.openCharacterEditor(character)}
                onDeleteCharacter={(id) =>
                  catalog.detail && catalog.selectedBookId &&
                  void editing.handleDeleteCharacter(id, catalog.selectedBookId, catalog.detail, patchDomain, bookRefresh)
                }
                onAddRelationship={() => editing.openRelationshipEditor()}
                onEditRelationship={(rel) => editing.openRelationshipEditor(rel)}
                onDeleteRelationship={(id) =>
                  catalog.detail && catalog.selectedBookId &&
                  void editing.handleDeleteRelationship(id, catalog.selectedBookId, catalog.detail, patchDomain, bookRefresh)
                }
              />
            )}
            {view === 'agent' && (
              <AgentChatView
                selectedBookId={catalog.selectedBookId}
                chat={chat}
                darkMode={darkMode}
                panelBorder={panelBorder}
              />
            )}
          </div>
        </div>
      </div>

      <CreateBookModal
        open={editing.createOpen}
        form={editing.createForm}
        onCancel={() => editing.setCreateOpen(false)}
        onFinish={(values) =>
          void editing.handleCreateBook(values, async (bookId) => {
            await catalog.refreshBooks(bookId)
            await catalog.refreshDetail(bookId)
          })
        }
      />

      <MetadataModal
        open={editing.metadataOpen}
        form={editing.metadataForm}
        onCancel={() => editing.setMetadataOpen(false)}
        onFinish={(values) =>
          catalog.selectedBookId &&
          void editing.handleSaveMetadata(values, catalog.selectedBookId, catalog.setDetail, bookRefresh)
        }
      />

      <ChapterModal
        open={editing.chapterOpen}
        form={editing.chapterForm}
        editingChapter={editing.editingChapter}
        onCancel={() => editing.setChapterOpen(false)}
        onFinish={(values) =>
          catalog.selectedBookId &&
          void editing.handleSaveChapter(values, catalog.selectedBookId, async () => {
            if (!catalog.selectedBookId) return
            await catalog.refreshDetail(catalog.selectedBookId)
            await catalog.refreshBooks(catalog.selectedBookId)
          })
        }
      />

      <CharacterModal
        open={editing.characterOpen}
        form={editing.characterForm}
        editingCharacter={editing.editingCharacter}
        onCancel={() => editing.setCharacterOpen(false)}
        onFinish={(values) =>
          catalog.detail && catalog.selectedBookId &&
          void editing.handleSaveCharacter(values, catalog.selectedBookId, catalog.detail, patchDomain, bookRefresh)
        }
      />

      <RelationshipModal
        open={editing.relationshipOpen}
        form={editing.relationshipForm}
        editingRelationship={editing.editingRelationship}
        onCancel={() => editing.setRelationshipOpen(false)}
        onFinish={(values) =>
          catalog.detail && catalog.selectedBookId &&
          void editing.handleSaveRelationship(values, catalog.selectedBookId, catalog.detail, patchDomain, bookRefresh)
        }
      />

      <ChapterPreviewDrawer
        chapter={editing.chapterPreview}
        onClose={() => editing.setChapterPreview(undefined)}
      />
    </ConfigProvider>
  )
}
