import { Button, Card, Space, Table, Tag } from 'antd'
import { EyeOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ChapterRecord } from '../../types'

interface ChaptersTabProps {
  chapters: ChapterRecord[]
  onNewChapter: () => void
  onPreviewChapter: (chapter: ChapterRecord) => void
  onEditChapter: (chapter: ChapterRecord) => void
}

export function ChaptersTab({
  chapters,
  onNewChapter,
  onPreviewChapter,
  onEditChapter,
}: ChaptersTabProps) {
  return (
    <Card
      title="Chapter preview and maintenance"
      size="small"
      style={{ borderRadius: 10 }}
      extra={
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={onNewChapter}>
          New Chapter
        </Button>
      }
    >
      <Table<ChapterRecord>
        rowKey="id"
        dataSource={chapters}
        pagination={false}
        size="small"
        columns={[
          { title: '#', dataIndex: 'number', width: 60 },
          { title: 'Title', dataIndex: 'title' },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 100,
            render: (v: string) => <Tag>{v}</Tag>,
          },
          { title: 'Rev', dataIndex: 'revision', width: 60 },
          { title: 'Summary', dataIndex: 'summary' },
          {
            title: 'Actions',
            width: 160,
            render: (_, chapter) => (
              <Space size="small">
                <Button
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => onPreviewChapter(chapter)}
                >
                  Preview
                </Button>
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => onEditChapter(chapter)}
                >
                  Revise
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )
}
