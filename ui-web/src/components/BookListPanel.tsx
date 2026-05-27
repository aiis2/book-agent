import { Button, Empty, Flex, Spin, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { bookAvatarGradient } from '../constants'
import type { BookSummary } from '../types'

const { Text } = Typography

interface BookListPanelProps {
  books: BookSummary[]
  selectedBookId: string | undefined
  loading: boolean
  darkMode: boolean
  panelBg: string
  panelBorder: string
  textMuted: string
  onSelectBook: (id: string) => void
  onCreateNew: () => void
}

export function BookListPanel({
  books,
  selectedBookId,
  loading,
  darkMode,
  panelBg,
  panelBorder,
  textMuted,
  onSelectBook,
  onCreateNew,
}: BookListPanelProps) {
  return (
    <div
      style={{
        width: 260,
        background: panelBg,
        borderRight: `1px solid ${panelBorder}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: '16px 14px 10px',
          borderBottom: `1px solid ${panelBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: textMuted,
            textTransform: 'uppercase',
          }}
        >
          Novels
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={onCreateNew}
          style={{ borderRadius: 6, height: 26, fontSize: 12 }}
        >
          New
        </Button>
      </div>

      {/* Book list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
        {loading ? (
          <Flex justify="center" style={{ padding: 24 }}>
            <Spin />
          </Flex>
        ) : books.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No novels yet"
            style={{ margin: '24px 0' }}
          />
        ) : (
          books.map((book) => {
            const [c1, c2] = bookAvatarGradient(book.title)
            const isActive = book.id === selectedBookId
            return (
              <div
                key={book.id}
                onClick={() => onSelectBook(book.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isActive
                    ? (darkMode ? 'rgba(124,92,232,0.14)' : 'rgba(124,92,232,0.08)')
                    : 'transparent',
                  marginBottom: 2,
                  border: `1px solid ${isActive ? 'rgba(124,92,232,0.3)' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${c1}, ${c2})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {book.title[0]?.toUpperCase() ?? 'B'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong ellipsis style={{ display: 'block', fontSize: 13, lineHeight: '18px' }}>
                    {book.title}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {book.genre} · {book.chapterCount} ch · {book.characterCount} chars
                  </Text>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
