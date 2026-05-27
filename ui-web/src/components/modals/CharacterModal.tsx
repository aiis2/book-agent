import { Button, Col, Form, Input, Modal, Row, Select } from 'antd'
import type { FormInstance } from 'antd'
import type { CharacterFormValues, CharacterProfile } from '../../types'

const { TextArea } = Input

interface CharacterModalProps {
  open: boolean
  form: FormInstance<CharacterFormValues>
  editingCharacter: CharacterProfile | undefined
  onCancel: () => void
  onFinish: (values: CharacterFormValues) => void
}

export function CharacterModal({
  open,
  form,
  editingCharacter,
  onCancel,
  onFinish,
}: CharacterModalProps) {
  return (
    <Modal
      title={editingCharacter ? `Edit ${editingCharacter.name}` : 'Add character'}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="id" label="ID">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="role" label="Role">
              <Select
                options={[
                  { value: 'protagonist' },
                  { value: 'antagonist' },
                  { value: 'supporting' },
                  { value: 'character' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="traitsText" label="Traits (comma-separated)">
              <Input placeholder="brave, cunning, loyal" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="aliasesText" label="Aliases (comma-separated)">
          <Input />
        </Form.Item>
        <Form.Item name="summary" label="Summary">
          <TextArea rows={2} />
        </Form.Item>
        <Form.Item name="biography" label="Biography">
          <TextArea rows={4} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <TextArea rows={2} />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          {editingCharacter ? 'Save character' : 'Add character'}
        </Button>
      </Form>
    </Modal>
  )
}
