import { useCallback, useEffect, useRef, useState } from 'react'
import { interactWithBook } from '../api'
import type { ChatMessage } from '../types'

export interface AgentChatState {
  chatMessages: ChatMessage[]
  chatInput: string
  chatLoading: boolean
  chatEndRef: React.RefObject<HTMLDivElement | null>
  setChatInput: (v: string) => void
  clearMessages: () => void
  handleAgentSend: (selectedBookId: string | undefined) => Promise<void>
}

export function useAgentChat(): AgentChatState {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  const clearMessages = useCallback(() => setChatMessages([]), [])

  const handleAgentSend = useCallback(async (selectedBookId: string | undefined) => {
    if (!chatInput.trim() || chatLoading || !selectedBookId) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg, ts: Date.now() }])
    setChatLoading(true)
    try {
      const result = await interactWithBook(selectedBookId, userMsg)
      setChatMessages((prev) => [...prev, {
        role: 'assistant',
        content: result.assistantResponse,
        ts: Date.now(),
      }])
    } catch (err) {
      setChatMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Error: ${String(err)}`,
        ts: Date.now(),
      }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading])

  return {
    chatMessages,
    chatInput,
    chatLoading,
    chatEndRef,
    setChatInput,
    clearMessages,
    handleAgentSend,
  }
}
