import { Button, Card, Space, Table, Tag } from 'antd'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { Relationship } from '../../types'

interface RelationshipsTabProps {
  relationships: Relationship[]
  onAddRelationship: () => void
  onEditRelationship: (relationship: Relationship) => void
  onDeleteRelationship: (relationshipId: string) => void
}

export function RelationshipsTab({
  relationships,
  onAddRelationship,
  onEditRelationship,
  onDeleteRelationship,
}: RelationshipsTabProps) {
  return (
    <Card
      title="Bloodline and relationship graph"
      size="small"
      style={{ borderRadius: 10 }}
      extra={
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={onAddRelationship}>
          Add Relationship
        </Button>
      }
    >
      <Table<Relationship>
        rowKey="id"
        dataSource={relationships}
        pagination={false}
        size="small"
        columns={[
          { title: 'From', dataIndex: 'fromCharacterId' },
          { title: 'To', dataIndex: 'toCharacterId' },
          {
            title: 'Type',
            dataIndex: 'type',
            width: 110,
            render: (v: string) => <Tag color="purple">{v}</Tag>,
          },
          { title: 'Label', dataIndex: 'label' },
          { title: 'Strength', dataIndex: 'strength', width: 90 },
          {
            title: 'Actions',
            width: 160,
            render: (_, rel) => (
              <Space size="small">
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => onEditRelationship(rel)}
                >
                  Edit
                </Button>
                <Button
                  danger
                  size="small"
                  onClick={() => onDeleteRelationship(rel.id)}
                >
                  Delete
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )
}
