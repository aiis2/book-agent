import { Card, Col, Empty, Flex, Row, Spin, Statistic, Tabs } from 'antd'
import {
  BookOutlined,
  ClusterOutlined,
  NodeIndexOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { OverviewTab } from './OverviewTab'
import { ChaptersTab } from './ChaptersTab'
import { CharactersTab } from './CharactersTab'
import { RelationshipsTab } from './RelationshipsTab'
import { ZepTab } from './ZepTab'
import type { BookDetail, CharacterProfile, ChapterRecord, Relationship } from '../../types'

interface CatalogViewProps {
  detail: BookDetail | undefined
  loading: boolean
  detailLoading: boolean
  zepDraft: string
  onZepDraftChange: (v: string) => void
  onSaveZepGraph: () => void
  onNewChapter: () => void
  onPreviewChapter: (chapter: ChapterRecord) => void
  onEditChapter: (chapter: ChapterRecord) => void
  onAddCharacter: () => void
  onEditCharacter: (character: CharacterProfile) => void
  onDeleteCharacter: (id: string) => void
  onAddRelationship: () => void
  onEditRelationship: (rel: Relationship) => void
  onDeleteRelationship: (id: string) => void
}

export function CatalogView({
  detail,
  loading,
  detailLoading,
  zepDraft,
  onZepDraftChange,
  onSaveZepGraph,
  onNewChapter,
  onPreviewChapter,
  onEditChapter,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onAddRelationship,
  onEditRelationship,
  onDeleteRelationship,
}: CatalogViewProps) {
  if (detailLoading || loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 360 }}>
        <Spin size="large" />
      </Flex>
    )
  }

  if (!detail) {
    return (
      <Card style={{ borderRadius: 12 }}>
        <Empty description="Create or select a novel to begin." />
      </Card>
    )
  }

  const statsItems = [
    { title: 'Chapters', value: detail.chapters.length, prefix: <BookOutlined /> },
    { title: 'Characters', value: detail.domain.characters.length, prefix: <TeamOutlined /> },
    { title: 'Relationships', value: detail.domain.relationships.length, prefix: <ClusterOutlined /> },
    { title: 'Zep Episodes', value: detail.domain.zepGraph.episodes.length, prefix: <NodeIndexOutlined /> },
  ]

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: <OverviewTab detail={detail} />,
    },
    {
      key: 'chapters',
      label: 'Chapters',
      children: (
        <ChaptersTab
          chapters={detail.chapters}
          onNewChapter={onNewChapter}
          onPreviewChapter={onPreviewChapter}
          onEditChapter={onEditChapter}
        />
      ),
    },
    {
      key: 'characters',
      label: 'Characters',
      children: (
        <CharactersTab
          characters={detail.domain.characters}
          onAddCharacter={onAddCharacter}
          onEditCharacter={onEditCharacter}
          onDeleteCharacter={onDeleteCharacter}
        />
      ),
    },
    {
      key: 'relationships',
      label: 'Relationships',
      children: (
        <RelationshipsTab
          relationships={detail.domain.relationships}
          onAddRelationship={onAddRelationship}
          onEditRelationship={onEditRelationship}
          onDeleteRelationship={onDeleteRelationship}
        />
      ),
    },
    {
      key: 'zep',
      label: 'Timeline / Zep',
      children: (
        <ZepTab
          detail={detail}
          zepDraft={zepDraft}
          onZepDraftChange={onZepDraftChange}
          onSaveZepGraph={onSaveZepGraph}
        />
      ),
    },
  ]

  return (
    <Flex vertical gap={20}>
      <Row gutter={[12, 12]}>
        {statsItems.map((item) => (
          <Col xs={24} md={12} xl={6} key={item.title}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic title={item.title} value={item.value} prefix={item.prefix} />
            </Card>
          </Col>
        ))}
      </Row>
      <Tabs defaultActiveKey="overview" items={tabItems} />
    </Flex>
  )
}
