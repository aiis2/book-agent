import { Button, Form, Input, Modal } from 'antd'
import type { FormInstance } from 'antd'
import type { ChapterRecord } from '../../types'

const { TextArea } = Input

interface ChapterModalProps {
  open: boolean
  form: FormInstance
  editingChapter: ChapterRecord | undefined
  onCancel: () => void
  onFinish: (values: Record<string, unknown>) => void
}

export function ChapterModal({
  open,
  form,
  editingChapter,
  onCancel,
  onFinish,
}: ChapterModalProps) {
  return (
    <Modal
      title={editingChapter ? `Revise ${editingChapter.title}` : 'Create chapter'}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={760}
      destroyOnHidden
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="summary" label="Summary">
          <Input />
        </Form.Item>
        <Form.Item
          name={editingChapter ? 'revisedContent' : 'content'}
          label="Content"
          rules={[{ required: true }]}
        >
          <TextArea rows={14} />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          {editingChapter ? 'Save revision' : 'Create chapter'}
        </Button>
      </Form>
    </Modal>
  )
}
