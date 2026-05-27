import { Drawer, Typography } from 'antd'
import type { ChapterRecord } from '../types'

const { Title } = Typography

interface ChapterPreviewDrawerProps {
  chapter: ChapterRecord | undefined
  onClose: () => void
}

export function ChapterPreviewDrawer({ chapter, onClose }: ChapterPreviewDrawerProps) {
  return (
    <Drawer
      title={chapter?.title ?? 'Chapter Preview'}
      open={!!chapter}
      onClose={onClose}
      width={720}
    >
      {chapter ? (
        <>
          <Title level={5} style={{ marginTop: 0 }}>
            Chapter {chapter.number} — {chapter.title}
          </Title>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{chapter.content}</pre>
        </>
      ) : null}
    </Drawer>
  )
}
