import { Button, Card, Space, Table, Tag } from 'antd'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { CharacterProfile } from '../../types'

interface CharactersTabProps {
  characters: CharacterProfile[]
  onAddCharacter: () => void
  onEditCharacter: (character: CharacterProfile) => void
  onDeleteCharacter: (characterId: string) => void
}

export function CharactersTab({
  characters,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
}: CharactersTabProps) {
  return (
    <Card
      title="Character profiles"
      size="small"
      style={{ borderRadius: 10 }}
      extra={
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={onAddCharacter}>
          Add Character
        </Button>
      }
    >
      <Table<CharacterProfile>
        rowKey="id"
        dataSource={characters}
        pagination={false}
        size="small"
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Role', dataIndex: 'role', width: 160 },
          {
            title: 'Traits',
            dataIndex: 'traits',
            render: (traits: string[]) => (
              <Space wrap size={4}>
                {traits.map((t) => (
                  <Tag key={t} style={{ marginBottom: 0 }}>
                    {t}
                  </Tag>
                ))}
              </Space>
            ),
          },
          { title: 'Summary', dataIndex: 'summary' },
          {
            title: 'Actions',
            width: 160,
            render: (_, character) => (
              <Space size="small">
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => onEditCharacter(character)}
                >
                  Edit
                </Button>
                <Button
                  danger
                  size="small"
                  onClick={() => onDeleteCharacter(character.id)}
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
