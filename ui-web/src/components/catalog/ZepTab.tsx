import { Button, Card, Col, Empty, Input, Row, Space, Tag, Timeline, Typography } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { formatMoment } from '../../constants'
import type { BookDetail } from '../../types'

const { Text, Paragraph } = Typography
const { TextArea } = Input

interface ZepTabProps {
  detail: BookDetail
  zepDraft: string
  onZepDraftChange: (v: string) => void
  onSaveZepGraph: () => void
}

export function ZepTab({ detail, zepDraft, onZepDraftChange, onSaveZepGraph }: ZepTabProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={10}>
        <Card
          title="Temporal episodes"
          size="small"
          style={{ borderRadius: 10 }}
          extra={<Tag color="cyan">episodes / entities / facts</Tag>}
        >
          {detail.domain.zepGraph.episodes.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Zep episodes yet" />
          ) : (
            <Timeline
              items={detail.domain.zepGraph.episodes.map((ep) => ({
                color: 'blue',
                children: (
                  <Space direction="vertical" size={2}>
                    <Text strong>{ep.title}</Text>
                    <Text type="secondary">
                      {formatMoment(ep.occurredAt)} · {ep.location || 'Location unset'}
                    </Text>
                    <Text>{ep.summary}</Text>
                  </Space>
                ),
              }))}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} xl={14}>
        <Card
          title="Raw Zep graph editor"
          size="small"
          style={{ borderRadius: 10 }}
          extra={
            <Button
              type="primary"
              icon={<SaveOutlined />}
              size="small"
              onClick={onSaveZepGraph}
            >
              Save Zep Graph
            </Button>
          }
        >
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
            Manual maintenance surface for the full temporal graph — episodes, entities, and facts.
          </Paragraph>
          <TextArea
            rows={18}
            value={zepDraft}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onZepDraftChange(e.target.value)}
            spellCheck={false}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </Card>
      </Col>
    </Row>
  )
}
