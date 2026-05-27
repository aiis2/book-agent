import { Button, Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd'
import type { FormInstance } from 'antd'
import { RELATIONSHIP_TYPES } from '../../constants'
import type { Relationship, RelationshipFormValues } from '../../types'

const { TextArea } = Input

interface RelationshipModalProps {
  open: boolean
  form: FormInstance<RelationshipFormValues>
  editingRelationship: Relationship | undefined
  onCancel: () => void
  onFinish: (values: RelationshipFormValues) => void
}

export function RelationshipModal({
  open,
  form,
  editingRelationship,
  onCancel,
  onFinish,
}: RelationshipModalProps) {
  return (
    <Modal
      title={editingRelationship ? 'Edit relationship' : 'Add relationship'}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={640}
      destroyOnHidden
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item name="id" label="ID">
          <Input />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="fromCharacterId"
              label="From character ID"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="toCharacterId"
              label="To character ID"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select
                options={RELATIONSHIP_TYPES.map((t) => ({ value: t }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="strength" label="Strength (0–1)">
              <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="label" label="Label">
          <Input />
        </Form.Item>
        <Form.Item name="summary" label="Summary">
          <TextArea rows={3} />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          {editingRelationship ? 'Save relationship' : 'Add relationship'}
        </Button>
      </Form>
    </Modal>
  )
}
