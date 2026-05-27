import { Alert, Button, Flex, Input, Spin, Typography } from 'antd'
import { RobotOutlined, SendOutlined } from '@ant-design/icons'
import { ACCENT } from '../constants'
import type { AgentChatState } from '../hooks/useAgentChat'

const { Text } = Typography
const { TextArea } = Input

interface AgentChatViewProps {
  selectedBookId: string | undefined
  chat: AgentChatState
  darkMode: boolean
  panelBorder: string
}

export function AgentChatView({
  selectedBookId,
  chat,
  darkMode,
  panelBorder,
}: AgentChatViewProps) {
  const { chatMessages, chatInput, chatLoading, chatEndRef, setChatInput, handleAgentSend } = chat

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {!selectedBookId && (
        <Alert
          type="info"
          showIcon
          message="Select a novel from the left panel to send agent requests against it."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Bubble list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 0,
        }}
      >
        {chatMessages.length === 0 && (
          <Flex
            justify="center"
            align="center"
            style={{ minHeight: 220, flexDirection: 'column', gap: 12, opacity: 0.45 }}
          >
            <RobotOutlined style={{ fontSize: 48, color: ACCENT }} />
            <Text type="secondary">Book Hermes Agent — ask me anything about the selected novel.</Text>
          </Flex>
        )}

        {chatMessages.map((msg, idx) => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${ACCENT}, #a29bfe)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  <RobotOutlined />
                </div>
              )}
              <div
                style={{
                  maxWidth: '72%',
                  padding: '10px 14px',
                  borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                  background: isUser
                    ? `linear-gradient(135deg, ${ACCENT}, #a29bfe)`
                    : (darkMode ? '#1e1e2e' : '#f0f0f8'),
                  color: isUser ? '#fff' : undefined,
                  fontSize: 14,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                }}
              >
                {msg.content}
              </div>
            </div>
          )
        })}

        {chatLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${ACCENT}, #a29bfe)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              <RobotOutlined />
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '4px 14px 14px 14px',
                background: darkMode ? '#1e1e2e' : '#f0f0f8',
              }}
            >
              <Spin size="small" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 12px',
          background: darkMode ? '#1a1a28' : '#f8f8fc',
          borderRadius: 12,
          border: `1px solid ${panelBorder}`,
          flexShrink: 0,
        }}
      >
        <TextArea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={
            selectedBookId
              ? 'Ask about this novel, request a chapter, revise the plot...'
              : 'Select a novel first...'
          }
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={!selectedBookId || chatLoading}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              void handleAgentSend(selectedBookId)
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            resize: 'none',
            boxShadow: 'none',
            padding: '2px 4px',
            fontSize: 14,
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => void handleAgentSend(selectedBookId)}
          disabled={!chatInput.trim() || !selectedBookId || chatLoading}
          loading={chatLoading}
          style={{ borderRadius: 8, height: 36, alignSelf: 'flex-end' }}
        >
          Send
        </Button>
      </div>
    </div>
  )
}
