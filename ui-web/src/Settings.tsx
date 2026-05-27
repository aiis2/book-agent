import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  ApiOutlined,
  CloudOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
  LockOutlined,
  PlusOutlined,
  RobotOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'

import { getSettings, updateSettings } from './api'
import type {
  AppSettings,
  McpServer,
  ModelService,
  Skill,
} from './types'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

// ── Nav item definitions ──────────────────────────────────────────────────────

interface NavItem {
  key: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { key: 'model-services', label: '模型服务', icon: <ApiOutlined /> },
  { key: 'default-models', label: '默认模型', icon: <RobotOutlined /> },
  { key: 'general', label: '常规设置', icon: <SettingOutlined /> },
  { key: 'display', label: '显示设置', icon: <EyeOutlined /> },
  { key: 'data', label: '数据设置', icon: <DatabaseOutlined /> },
  { key: 'mcp-servers', label: 'MCP 服务', icon: <UnorderedListOutlined /> },
  { key: 'skills', label: '技能', icon: <ThunderboltOutlined /> },
  { key: 'web-search', label: '网络搜索', icon: <GlobalOutlined /> },
  { key: 'global-memory', label: '全局记忆', icon: <CloudOutlined /> },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface SettingsPanelProps {
  darkMode: boolean
  accent: string
}

// ── Model Service Editor modal ────────────────────────────────────────────────

interface ModelServiceEditorProps {
  service: ModelService | null
  onSave: (service: ModelService) => void
  onClose: () => void
}

function ModelServiceEditor({ service, onSave, onClose }: ModelServiceEditorProps) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (service) {
      form.setFieldsValue({
        ...service,
        modelsText: service.models.map(m => m.id).join('\n'),
      })
    } else {
      form.resetFields()
    }
  }, [service, form])

  function handleOk() {
    form.validateFields().then((values) => {
      const models = (values.modelsText as string)
        .split(/[\n,]+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .map((id: string) => ({ id, name: id, enabled: true }))
      onSave({
        id: service?.id ?? `svc-${Date.now().toString(36)}`,
        name: values.name,
        type: values.type ?? 'openai-compatible',
        baseUrl: values.baseUrl,
        apiKey: values.apiKey ?? '',
        enabled: values.enabled ?? true,
        models,
      })
    })
  }

  return (
    <Modal
      open
      title={service ? '编辑模型服务' : '添加模型服务'}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="name" label="服务名称" rules={[{ required: true }]}>
          <Input placeholder="例如：DeepSeek" />
        </Form.Item>
        <Form.Item name="type" label="服务类型" initialValue="openai-compatible">
          <Select>
            <Select.Option value="openai-compatible">OpenAI 兼容</Select.Option>
            <Select.Option value="anthropic">Anthropic</Select.Option>
            <Select.Option value="custom">自定义</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="baseUrl" label="API 地址">
          <Input placeholder="https://api.deepseek.com/v1" />
        </Form.Item>
        <Form.Item name="apiKey" label="API 密钥">
          <Input.Password placeholder="sk-..." />
        </Form.Item>
        <Form.Item name="modelsText" label="可用模型（每行一个模型 ID）">
          <TextArea rows={4} placeholder={'deepseek-chat\ndeepseek-reasoner'} />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── MCP Server Editor modal ───────────────────────────────────────────────────

interface McpEditorProps {
  server: McpServer | null
  onSave: (server: McpServer) => void
  onClose: () => void
}

function McpServerEditor({ server, onSave, onClose }: McpEditorProps) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (server) {
      form.setFieldsValue({
        ...server,
        argsText: server.args.join(' '),
        envText: Object.entries(server.env)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n'),
      })
    } else {
      form.resetFields()
    }
  }, [server, form])

  function handleOk() {
    form.validateFields().then((values) => {
      const args = (values.argsText as string ?? '').split(/\s+/).filter(Boolean)
      const envEntries = (values.envText as string ?? '')
        .split('\n')
        .map((line: string) => line.split('='))
        .filter((parts: string[]) => parts.length === 2)
      const env = Object.fromEntries(envEntries.map(([k, v]: string[]) => [k.trim(), v.trim()]))
      onSave({
        id: server?.id ?? `mcp-${Date.now().toString(36)}`,
        name: values.name,
        command: values.command,
        args,
        env,
        enabled: values.enabled ?? true,
      })
    })
  }

  return (
    <Modal
      open
      title={server ? '编辑 MCP 服务' : '添加 MCP 服务'}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="name" label="服务名称" rules={[{ required: true }]}>
          <Input placeholder="My MCP Server" />
        </Form.Item>
        <Form.Item name="command" label="命令" rules={[{ required: true }]}>
          <Input placeholder="node /path/to/server.js" />
        </Form.Item>
        <Form.Item name="argsText" label="参数（空格分隔）">
          <Input placeholder="--port 3000 --verbose" />
        </Form.Item>
        <Form.Item name="envText" label="环境变量（每行 KEY=VALUE）">
          <TextArea rows={3} placeholder={'API_KEY=xxx\nDEBUG=true'} />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── Skill Editor modal ────────────────────────────────────────────────────────

interface SkillEditorProps {
  skill: Skill | null
  onSave: (skill: Skill) => void
  onClose: () => void
}

function SkillEditor({ skill, onSave, onClose }: SkillEditorProps) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (skill) {
      form.setFieldsValue(skill)
    } else {
      form.resetFields()
    }
  }, [skill, form])

  function handleOk() {
    form.validateFields().then((values) => {
      onSave({
        id: skill?.id ?? `skill-${Date.now().toString(36)}`,
        name: values.name,
        description: values.description ?? '',
        systemPrompt: values.systemPrompt ?? '',
        enabled: values.enabled ?? true,
      })
    })
  }

  return (
    <Modal
      open
      title={skill ? '编辑技能' : '添加技能'}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      width={560}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="name" label="技能名称" rules={[{ required: true }]}>
          <Input placeholder="章节审查助手" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input placeholder="这个技能可以..." />
        </Form.Item>
        <Form.Item name="systemPrompt" label="系统提示词">
          <TextArea rows={6} placeholder="你是一位专业的文学编辑..." />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── Default settings (client-side initial state) ─────────────────────────────

const DEFAULT_APP_SETTINGS: AppSettings = {
  modelServices: [],
  defaultModels: { writeModel: '', chatModel: '', reviseModel: '', coverModel: '' },
  general: { language: 'zh-CN', autoSave: true, maxToolIterations: 12, sendWithEnter: true },
  display: { theme: 'dark', fontSize: 14, contentMaxWidth: 860, showLineNumbers: true },
  data: { workspacePath: '', autoBackup: false, backupInterval: 24 },
  mcpServers: [],
  skills: { enabled: true, list: [] },
  webSearch: { enabled: false, provider: 'tavily', apiKey: '', maxResults: 5 },
  globalMemory: { enabled: false, provider: 'built-in', maxEntries: 100, autoCompress: true },
}

// ── Main Settings panel ───────────────────────────────────────────────────────

export function SettingsPanel({ darkMode, accent }: SettingsPanelProps) {
  const [messageApi, contextHolder] = message.useMessage()
  const [section, setSection] = useState('model-services')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving] = useState(false)

  // sub-editors
  const [editingService, setEditingService] = useState<ModelService | null | 'new'>()
  const [editingMcp, setEditingMcp] = useState<McpServer | null | 'new'>()
  const [editingSkill, setEditingSkill] = useState<Skill | null | 'new'>()

  // Theme tokens
  const navBg = darkMode ? '#111118' : '#f0f0f5'
  const contentBg = darkMode ? '#16161e' : '#ffffff'
  const borderColor = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const mutedText = darkMode ? '#8b8fa8' : '#6b7280'
  const sectionTitle = darkMode ? '#e2e2f0' : '#111827'

  useEffect(() => {
    getSettings()
      .then(({ settings: s }) => { setSettings(s); setLoadingSettings(false) })
      .catch((err) => { messageApi.error(`加载设置失败: ${String(err)}`); setLoadingSettings(false) })
  }, [messageApi])

  async function patch(key: keyof AppSettings, value: unknown) {
    setSaving(true)
    try {
      const { settings: next } = await updateSettings({ [key]: value } as Partial<AppSettings>)
      setSettings(next)
      messageApi.success('已保存')
    } catch (err) {
      messageApi.error(`保存失败: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  if (loadingSettings) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: contentBg }}>
        <Text style={{ color: mutedText }}>加载中…</Text>
      </div>
    )
  }

  // ── Nav ───────────────────────────────────────────────────────────────────

  function renderNav() {
    return (
      <div
        style={{
          width: 200,
          background: navBg,
          borderRight: `1px solid ${borderColor}`,
          flexShrink: 0,
          overflowY: 'auto',
          padding: '16px 0',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = section === item.key
          return (
            <div
              key={item.key}
              onClick={() => setSection(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 18px',
                cursor: 'pointer',
                borderRadius: 6,
                margin: '2px 8px',
                background: active ? `${accent}22` : 'transparent',
                color: active ? accent : mutedText,
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Section: Model Services ───────────────────────────────────────────────

  function renderModelServices() {
    return (
      <div>
        <SectionHeader title="模型服务" desc="配置 AI 模型提供商，支持 OpenAI 兼容接口。API 密钥在本地安全存储。" />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEditingService('new')}
          style={{ marginBottom: 16 }}
        >
          添加服务
        </Button>
        {settings.modelServices.length === 0 && (
          <Alert message="暂无模型服务，请点击上方按钮添加服务" type="info" showIcon style={{ marginBottom: 12 }} />
        )}
        {settings.modelServices.map((svc) => (
          <ModelServiceCard
            key={svc.id}
            svc={svc}
            darkMode={darkMode}
            borderColor={borderColor}
            mutedText={mutedText}
            sectionTitle={sectionTitle}
            accent={accent}
            onEdit={() => setEditingService(svc)}
            onToggle={(enabled) => {
              const next = settings.modelServices.map(s => s.id === svc.id ? { ...s, enabled } : s)
              void patch('modelServices', next)
            }}
            onDelete={() => {
              const next = settings.modelServices.filter(s => s.id !== svc.id)
              void patch('modelServices', next)
            }}
          />
        ))}

        {editingService !== undefined && (
          <ModelServiceEditor
            service={editingService === 'new' ? null : editingService}
            onSave={(svc) => {
              const existing = settings.modelServices.some(s => s.id === svc.id)
              const next = existing
                ? settings.modelServices.map(s => s.id === svc.id ? svc : s)
                : [...settings.modelServices, svc]
              void patch('modelServices', next)
              setEditingService(undefined)
            }}
            onClose={() => setEditingService(undefined)}
          />
        )}
      </div>
    )
  }

  // ── Section: Default Models ───────────────────────────────────────────────

  function renderDefaultModels() {
    const allModels: { label: string; value: string }[] = settings.modelServices
      .filter(s => s.enabled)
      .flatMap(s => s.models.filter(m => m.enabled).map(m => ({
        label: `${s.name} / ${m.name}`,
        value: `${s.id}:${m.id}`,
      })))

    const modelSelect = (field: keyof typeof settings.defaultModels, label: string, tooltip: string) => (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Text style={{ color: sectionTitle, fontWeight: 500 }}>{label}</Text>
          <Tooltip title={tooltip}>
            <Text style={{ color: mutedText, fontSize: 12, cursor: 'help' }}>(?)</Text>
          </Tooltip>
        </div>
        <Select
          style={{ width: '100%' }}
          value={settings.defaultModels[field]}
          options={allModels}
          placeholder="请选择模型"
          onChange={(val) => void patch('defaultModels', { ...settings.defaultModels, [field]: val })}
        />
      </div>
    )

    return (
      <div>
        <SectionHeader title="默认模型" desc="为不同任务指定默认使用的模型，可随时切换。" />
        {allModels.length === 0 && (
          <Alert message="请先在【模型服务】中添加并启用至少一个模型" type="warning" showIcon style={{ marginBottom: 16 }} />
        )}
        {modelSelect('chatModel', '对话模型', '用于 AI Agent 对话和交互式问答')}
        {modelSelect('writeModel', '写作模型', '用于生成和续写章节内容')}
        {modelSelect('reviseModel', '修改模型', '用于修改润色已有章节')}
        {modelSelect('coverModel', '封面模型', '用于根据描述生成封面')}
      </div>
    )
  }

  // ── Section: General ─────────────────────────────────────────────────────

  function renderGeneral() {
    const g = settings.general
    return (
      <div>
        <SectionHeader title="常规设置" desc="基础行为配置，影响整体工作流。" />

        <SettingRow
          label="界面语言"
          desc="切换界面显示语言"
        >
          <Select
            value={g.language}
            style={{ width: 180 }}
            onChange={(v) => void patch('general', { ...g, language: v })}
            options={[
              { label: '中文', value: 'zh-CN' },
              { label: 'English', value: 'en' },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="发送快捷键"
          desc="在输入框中按下快捷键发送消息"
        >
          <Select
            value={g.sendWithEnter ? 'enter' : 'ctrl-enter'}
            style={{ width: 180 }}
            onChange={(v) => void patch('general', { ...g, sendWithEnter: v === 'enter' })}
            options={[
              { label: 'Enter', value: 'enter' },
              { label: 'Ctrl + Enter', value: 'ctrl-enter' },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="自动保存"
          desc="修改后自动保存到磁盘"
        >
          <Switch
            checked={g.autoSave}
            onChange={(v) => void patch('general', { ...g, autoSave: v })}
          />
        </SettingRow>

        <SettingRow
          label="最大工具调用次数"
          desc="Agent 单轮最多调用工具次数，超出后停止"
        >
          <InputNumber
            min={1}
            max={50}
            value={g.maxToolIterations}
            onChange={(v) => { if (v != null) void patch('general', { ...g, maxToolIterations: v }) }}
          />
        </SettingRow>
      </div>
    )
  }

  // ── Section: Display ─────────────────────────────────────────────────────

  function renderDisplay() {
    const d = settings.display
    return (
      <div>
        <SectionHeader title="显示设置" desc="调整界面外观与布局偏好。" />

        <SettingRow label="主题" desc="深色模式或浅色模式（在侧边栏可快速切换）">
          <Select
            value={d.theme}
            style={{ width: 180 }}
            onChange={(v: 'dark' | 'light') => void patch('display', { ...d, theme: v })}
            options={[
              { label: '深色', value: 'dark' },
              { label: '浅色', value: 'light' },
            ]}
          />
        </SettingRow>

        <SettingRow label="字体大小" desc="正文内容的基础字号（px）">
          <InputNumber
            min={11}
            max={22}
            value={d.fontSize}
            onChange={(v) => { if (v != null) void patch('display', { ...d, fontSize: v }) }}
          />
        </SettingRow>

        <SettingRow label="内容最大宽度" desc="正文区域最大宽度限制（px），0 表示不限制">
          <InputNumber
            min={0}
            max={1400}
            step={20}
            value={d.contentMaxWidth}
            onChange={(v) => { if (v != null) void patch('display', { ...d, contentMaxWidth: v }) }}
          />
        </SettingRow>

        <SettingRow label="显示行号" desc="代码块是否显示行号">
          <Switch
            checked={d.showLineNumbers}
            onChange={(v) => void patch('display', { ...d, showLineNumbers: v })}
          />
        </SettingRow>
      </div>
    )
  }

  // ── Section: Data ─────────────────────────────────────────────────────────

  function renderData() {
    const d = settings.data
    return (
      <div>
        <SectionHeader title="数据设置" desc="管理工作区路径和备份策略。" />

        <SettingRow label="工作区路径" desc="书籍项目保存目录，留空使用默认路径">
          <Input
            style={{ width: 320 }}
            value={d.workspacePath}
            placeholder="（默认）"
            onBlur={(e) => void patch('data', { ...d, workspacePath: e.target.value })}
            onChange={(e) => setSettings(s => s ? { ...s, data: { ...s.data, workspacePath: e.target.value } } : s)}
          />
        </SettingRow>

        <SettingRow label="自动备份" desc="定时将设置文件备份到工作区">
          <Switch
            checked={d.autoBackup}
            onChange={(v) => void patch('data', { ...d, autoBackup: v })}
          />
        </SettingRow>

        {d.autoBackup && (
          <SettingRow label="备份间隔（小时）" desc="">
            <InputNumber
              min={1}
              max={168}
              value={d.backupInterval}
              onChange={(v) => { if (v != null) void patch('data', { ...d, backupInterval: v }) }}
            />
          </SettingRow>
        )}

        <Divider style={{ margin: '24px 0 16px' }} />
        <Text style={{ color: mutedText, fontSize: 13 }}>危险操作</Text>
        <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
          <Button
            danger
            onClick={() => {
              Modal.confirm({
                title: '清空所有会话记录？',
                content: '此操作不可恢复，仅清除交互记录，不影响书籍数据。',
                okText: '确认清空',
                cancelText: '取消',
                onOk: () => messageApi.info('会话记录已清空（当前版本暂无持久化会话）'),
              })
            }}
          >
            清空会话记录
          </Button>
        </div>
      </div>
    )
  }

  // ── Section: MCP Servers ──────────────────────────────────────────────────

  function renderMcpServers() {
    const servers = settings.mcpServers
    return (
      <div>
        <SectionHeader
          title="MCP 服务"
          desc="配置 Model Context Protocol 服务，用于扩展 Agent 的外部能力（文件系统、数据库、搜索等）。"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEditingMcp('new')}
          style={{ marginBottom: 16 }}
        >
          添加 MCP 服务
        </Button>
        <Table
          dataSource={servers}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无 MCP 服务' }}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '命令', dataIndex: 'command', ellipsis: true },
            {
              title: '状态',
              dataIndex: 'enabled',
              render: (enabled: boolean) => (
                <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>
              ),
            },
            {
              title: '操作',
              render: (_: unknown, record: McpServer) => (
                <Space size="small">
                  <Button size="small" icon={<EditOutlined />} onClick={() => setEditingMcp(record)} />
                  <Switch
                    size="small"
                    checked={record.enabled}
                    onChange={(v) => {
                      const next = servers.map(s => s.id === record.id ? { ...s, enabled: v } : s)
                      void patch('mcpServers', next)
                    }}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const next = servers.filter(s => s.id !== record.id)
                      void patch('mcpServers', next)
                    }}
                  />
                </Space>
              ),
            },
          ]}
        />
        {editingMcp !== undefined && (
          <McpServerEditor
            server={editingMcp === 'new' ? null : editingMcp}
            onSave={(s) => {
              const exists = servers.some(x => x.id === s.id)
              const next = exists ? servers.map(x => x.id === s.id ? s : x) : [...servers, s]
              void patch('mcpServers', next)
              setEditingMcp(undefined)
            }}
            onClose={() => setEditingMcp(undefined)}
          />
        )}
      </div>
    )
  }

  // ── Section: Skills ───────────────────────────────────────────────────────

  function renderSkills() {
    const { list } = settings.skills
    return (
      <div>
        <SectionHeader
          title="技能"
          desc="管理 Agent 可调用的预设技能（带有系统提示词的功能模板）。启用后可在对话中触发。"
        />

        <SettingRow label="启用技能系统" desc="关闭后 Agent 将忽略所有技能定义">
          <Switch
            checked={settings.skills.enabled}
            onChange={(v) => void patch('skills', { ...settings.skills, enabled: v })}
          />
        </SettingRow>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEditingSkill('new')}
          disabled={!settings.skills.enabled}
          style={{ margin: '12px 0 8px' }}
        >
          添加技能
        </Button>

        <Table
          dataSource={list}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无技能' }}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '描述', dataIndex: 'description', ellipsis: true },
            {
              title: '状态',
              dataIndex: 'enabled',
              render: (enabled: boolean) => (
                <Tag color={enabled ? 'purple' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>
              ),
            },
            {
              title: '操作',
              render: (_: unknown, record: Skill) => (
                <Space size="small">
                  <Button size="small" icon={<EditOutlined />} onClick={() => setEditingSkill(record)} />
                  <Switch
                    size="small"
                    checked={record.enabled}
                    onChange={(v) => {
                      const next = list.map(s => s.id === record.id ? { ...s, enabled: v } : s)
                      void patch('skills', { ...settings.skills, list: next })
                    }}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const next = list.filter(s => s.id !== record.id)
                      void patch('skills', { ...settings.skills, list: next })
                    }}
                  />
                </Space>
              ),
            },
          ]}
        />

        {editingSkill !== undefined && (
          <SkillEditor
            skill={editingSkill === 'new' ? null : editingSkill}
            onSave={(s) => {
              const exists = list.some(x => x.id === s.id)
              const next = exists ? list.map(x => x.id === s.id ? s : x) : [...list, s]
              void patch('skills', { ...settings.skills, list: next })
              setEditingSkill(undefined)
            }}
            onClose={() => setEditingSkill(undefined)}
          />
        )}
      </div>
    )
  }

  // ── Section: Web Search ───────────────────────────────────────────────────

  function renderWebSearch() {
    const ws = settings.webSearch
    return (
      <div>
        <SectionHeader
          title="网络搜索"
          desc="启用后 Agent 可在回答时检索互联网获取最新信息。"
        />

        <SettingRow label="启用网络搜索" desc="">
          <Switch
            checked={ws.enabled}
            onChange={(v) => void patch('webSearch', { ...ws, enabled: v })}
          />
        </SettingRow>

        {ws.enabled && (
          <>
            <SettingRow label="搜索引擎" desc="选择搜索服务提供商">
              <Select
                value={ws.provider}
                style={{ width: 200 }}
                onChange={(v) => void patch('webSearch', { ...ws, provider: v })}
                options={[
                  { label: 'Tavily', value: 'tavily' },
                  { label: 'Brave Search', value: 'brave' },
                  { label: 'Bing', value: 'bing' },
                  { label: 'Google (Custom Search)', value: 'google' },
                ]}
              />
            </SettingRow>

            <SettingRow label="搜索 API 密钥" desc="">
              <Input.Password
                style={{ width: 320 }}
                value={ws.apiKey}
                placeholder="输入 API 密钥"
                onBlur={(e) => void patch('webSearch', { ...ws, apiKey: e.target.value })}
                onChange={(e) => setSettings(s => s ? { ...s, webSearch: { ...s.webSearch, apiKey: e.target.value } } : s)}
              />
            </SettingRow>

            <SettingRow label="最多返回结果数" desc="">
              <InputNumber
                min={1}
                max={20}
                value={ws.maxResults}
                onChange={(v) => { if (v != null) void patch('webSearch', { ...ws, maxResults: v }) }}
              />
            </SettingRow>
          </>
        )}
      </div>
    )
  }

  // ── Section: Global Memory ────────────────────────────────────────────────

  function renderGlobalMemory() {
    const gm = settings.globalMemory
    return (
      <div>
        <SectionHeader
          title="全局记忆"
          desc="启用后系统会在每次 Agent 对话时注入全局背景知识，帮助 Agent 更好地理解上下文。"
        />

        <SettingRow label="启用全局记忆" desc="">
          <Switch
            checked={gm.enabled}
            onChange={(v) => void patch('globalMemory', { ...gm, enabled: v })}
          />
        </SettingRow>

        {gm.enabled && (
          <>
            <SettingRow label="记忆存储方式" desc="">
              <Select
                value={gm.provider}
                style={{ width: 200 }}
                onChange={(v) => void patch('globalMemory', { ...gm, provider: v })}
                options={[
                  { label: '内置存储', value: 'built-in' },
                  { label: 'Zep（图谱记忆）', value: 'zep' },
                ]}
              />
            </SettingRow>

            <SettingRow label="最大记忆条目" desc="超出后按 LRU 策略淘汰">
              <InputNumber
                min={10}
                max={2000}
                value={gm.maxEntries}
                onChange={(v) => { if (v != null) void patch('globalMemory', { ...gm, maxEntries: v }) }}
              />
            </SettingRow>

            <SettingRow label="自动压缩" desc="当记忆接近上限时自动摘要压缩">
              <Switch
                checked={gm.autoCompress}
                onChange={(v) => void patch('globalMemory', { ...gm, autoCompress: v })}
              />
            </SettingRow>
          </>
        )}
      </div>
    )
  }

  // ── Section dispatcher ────────────────────────────────────────────────────

  function renderSection() {
    switch (section) {
      case 'model-services': return renderModelServices()
      case 'default-models': return renderDefaultModels()
      case 'general': return renderGeneral()
      case 'display': return renderDisplay()
      case 'data': return renderData()
      case 'mcp-servers': return renderMcpServers()
      case 'skills': return renderSkills()
      case 'web-search': return renderWebSearch()
      case 'global-memory': return renderGlobalMemory()
      default: return null
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {contextHolder}
      {renderNav()}
      <div
        style={{
          flex: 1,
          background: contentBg,
          overflowY: 'auto',
          padding: '28px 36px',
        }}
      >
        {saving && (
          <div style={{ position: 'absolute', top: 12, right: 20, color: mutedText, fontSize: 12 }}>
            保存中…
          </div>
        )}
        {renderSection()}
      </div>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  desc: string
}
function SectionHeader({ title, desc }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <Title level={4} style={{ margin: 0, marginBottom: 6 }}>{title}</Title>
      {desc && <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>{desc}</Paragraph>}
    </div>
  )
}

interface SettingRowProps {
  label: string
  desc: string
  children: React.ReactNode
}
function SettingRow({ label, desc, children }: SettingRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: '1px solid rgba(128,128,128,0.1)',
      }}
    >
      <div>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 24 }}>{children}</div>
    </div>
  )
}

// ── ModelServiceCard ──────────────────────────────────────────────────────────

interface ModelServiceCardProps {
  svc: ModelService
  darkMode: boolean
  borderColor: string
  mutedText: string
  sectionTitle: string
  accent: string
  onEdit: () => void
  onToggle: (enabled: boolean) => void
  onDelete: () => void
}

function ModelServiceCard({
  svc,
  darkMode,
  borderColor,
  mutedText,
  sectionTitle,
  accent,
  onEdit,
  onToggle,
  onDelete,
}: ModelServiceCardProps) {
  const cardBg = darkMode ? '#1e1e2a' : '#f8f8fc'
  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: `${accent}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: accent,
          flexShrink: 0,
        }}
      >
        <ApiOutlined />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: sectionTitle, fontSize: 14 }}>
          {svc.name}
          {!svc.enabled && <Tag style={{ marginLeft: 8 }} color="default">已禁用</Tag>}
        </div>
        <div style={{ color: mutedText, fontSize: 12, marginTop: 2 }}>
          {svc.baseUrl || '未配置地址'}
          {svc.apiKey ? (
            <span style={{ marginLeft: 8, color: '#52c41a' }}>
              <LockOutlined /> 已配置密钥
            </span>
          ) : (
            <span style={{ marginLeft: 8, color: '#ff7875' }}>未配置密钥</span>
          )}
        </div>
        <div style={{ marginTop: 4 }}>
          {svc.models.slice(0, 4).map(m => (
            <Tag key={m.id} style={{ fontSize: 11, padding: '0 5px' }}>{m.id}</Tag>
          ))}
          {svc.models.length > 4 && (
            <Tag style={{ fontSize: 11, padding: '0 5px' }}>+{svc.models.length - 4}</Tag>
          )}
        </div>
      </div>
      <Space>
        <Switch size="small" checked={svc.enabled} onChange={onToggle} />
        <Button size="small" icon={<EditOutlined />} onClick={onEdit} />
        <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete} />
      </Space>
    </div>
  )
}
