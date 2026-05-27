import { Button, Form, Input, Modal, Select } from 'antd'
import type { FormInstance } from 'antd'
import { PLATFORM_OPTIONS } from '../../constants'

const { TextArea } = Input

interface CreateBookModalProps {
  open: boolean
  form: FormInstance
  onCancel: () => void
  onFinish: (values: Record<string, unknown>) => void
}

export function CreateBookModal({ open, form, onCancel, onFinish }: CreateBookModalProps) {
  return (
    <Modal
      title="Create novel"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="genre" label="Genre" initialValue="mystery">
          <Input />
        </Form.Item>
        <Form.Item name="platform" label="Platform" initialValue="qidian">
          <Select options={PLATFORM_OPTIONS} />
        </Form.Item>
        <Form.Item name="authorIntent" label="Author intent">
          <TextArea rows={3} />
        </Form.Item>
        <Form.Item name="currentFocus" label="Current focus">
          <TextArea rows={3} />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Create
        </Button>
      </Form>
    </Modal>
  )
}
