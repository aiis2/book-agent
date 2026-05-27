import { Button, Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd'
import type { FormInstance } from 'antd'
import { PLATFORM_OPTIONS } from '../../constants'

const { TextArea } = Input

interface MetadataModalProps {
  open: boolean
  form: FormInstance
  onCancel: () => void
  onFinish: (values: Record<string, unknown>) => void
}

export function MetadataModal({ open, form, onCancel, onFinish }: MetadataModalProps) {
  return (
    <Modal
      title="Edit metadata"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="genre" label="Genre">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="platform" label="Platform">
              <Select options={PLATFORM_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="targetChapters" label="Target chapters">
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="chapterWordCount" label="Chapter word count">
              <InputNumber min={1000} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="authorIntent" label="Author intent">
          <TextArea rows={3} />
        </Form.Item>
        <Form.Item name="currentFocus" label="Current focus">
          <TextArea rows={3} />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Save metadata
        </Button>
      </Form>
    </Modal>
  )
}
