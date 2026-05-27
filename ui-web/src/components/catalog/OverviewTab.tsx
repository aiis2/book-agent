import { Card, Col, Descriptions, Divider, Empty, List, Row, Space, Tag, Typography } from 'antd'
import type { BookDetail } from '../../types'

const { Paragraph, Text } = Typography

interface OverviewTabProps {
  detail: BookDetail
}

export function OverviewTab({ detail }: OverviewTabProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <Card title="Novel metadata" size="small" style={{ borderRadius: 10 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Book ID">{detail.book.id}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color="blue">{detail.book.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Genre">{detail.book.genre}</Descriptions.Item>
            <Descriptions.Item label="Platform">{detail.book.platform}</Descriptions.Item>
            <Descriptions.Item label="Target chapters">{detail.book.targetChapters}</Descriptions.Item>
            <Descriptions.Item label="Target chapter words">{detail.book.chapterWordCount}</Descriptions.Item>
            <Descriptions.Item label="Language">{detail.book.language ?? '—'}</Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>

      <Col xs={24} xl={12}>
        <Card title="Editorial state" size="small" style={{ borderRadius: 10 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">Author intent</Text>
              <Paragraph style={{ marginBottom: 0 }}>{detail.authorIntent || 'Not set'}</Paragraph>
            </div>
            <Divider style={{ margin: 0 }} />
            <div>
              <Text type="secondary">Current focus</Text>
              <Paragraph style={{ marginBottom: 0 }}>{detail.currentFocus || 'Not set'}</Paragraph>
            </div>
          </Space>
        </Card>
      </Col>

      <Col span={24}>
        <Card title="Truth files" size="small" style={{ borderRadius: 10 }}>
          {detail.truthFiles.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No truth files yet" />
          ) : (
            <List
              dataSource={detail.truthFiles}
              renderItem={(truth) => (
                <List.Item>
                  <List.Item.Meta
                    title={truth.name}
                    description={
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{truth.content}</pre>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}
