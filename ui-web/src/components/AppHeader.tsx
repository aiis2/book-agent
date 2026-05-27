import { Button, Space, Typography } from 'antd'
import {
  CloudSyncOutlined,
  EditOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import type { BookDetail, ViewMode } from '../types'

const { Text } = Typography

interface AppHeaderProps {
  view: ViewMode
  detail: BookDetail | undefined
  chatMessagesCount: number
  panelBorder: string
  headerBg: string
  onOpenMetadata: () => void
  onRefreshDetail: () => void
  onExport: () => void
  onClearChat: () => void
}

export function AppHeader({
  view,
  detail,
  chatMessagesCount,
  panelBorder,
  headerBg,
  onOpenMetadata,
  onRefreshDetail,
  onExport,
  onClearChat,
}: AppHeaderProps) {
  return (
    <div
      style={{
        padding: '12px 24px',
        borderBottom: `1px solid ${panelBorder}`,
        background: headerBg,
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Text strong style={{ fontSize: 16 }}>
          {detail?.book.title ?? (view === 'agent' ? 'AI Agent' : 'Select a novel')}
        </Text>
        {detail && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            {detail.book.genre} · {detail.book.platform} · updated {detail.book.updatedAt}
          </Text>
        )}
      </div>

      {view === 'catalog' && (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={onOpenMetadata}
            disabled={!detail}
          >
            Metadata
          </Button>
          <Button
            icon={<CloudSyncOutlined />}
            size="small"
            onClick={onRefreshDetail}
            disabled={!detail}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            size="small"
            onClick={onExport}
            disabled={!detail}
          >
            Export
          </Button>
        </Space>
      )}

      {view === 'agent' && (
        <Button
          size="small"
          onClick={onClearChat}
          disabled={chatMessagesCount === 0}
        >
          Clear
        </Button>
      )}
    </div>
  )
}
