import { Tooltip } from 'antd'
import {
  BookOutlined,
  MessageOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { ACCENT, SIDEBAR_BG } from '../constants'
import type { ViewMode } from '../types'

interface NavIconProps {
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
  tooltip: string
}

function NavIcon({ icon, active, onClick, tooltip }: NavIconProps) {
  return (
    <Tooltip title={tooltip} placement="right">
      <div
        onClick={onClick}
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          cursor: 'pointer',
          background: active ? 'rgba(124,92,232,0.22)' : 'transparent',
          color: active ? ACCENT : '#8b8fa8',
          fontSize: 20,
          transition: 'all 0.15s',
        }}
      >
        {icon}
      </div>
    </Tooltip>
  )
}

interface NavSidebarProps {
  view: ViewMode
  darkMode: boolean
  onViewChange: (v: ViewMode) => void
  onToggleDark: () => void
}

export function NavSidebar({ view, darkMode, onViewChange, onToggleDark }: NavSidebarProps) {
  return (
    <div
      style={{
        width: 60,
        background: SIDEBAR_BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 4,
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        zIndex: 10,
      }}
    >
      {/* Logo badge */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${ACCENT}, #a29bfe)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 18,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        B
      </div>

      <NavIcon
        icon={<BookOutlined />}
        active={view === 'catalog'}
        onClick={() => onViewChange('catalog')}
        tooltip="Books"
      />
      <NavIcon
        icon={<MessageOutlined />}
        active={view === 'agent'}
        onClick={() => onViewChange('agent')}
        tooltip="AI Agent"
      />

      <div style={{ flex: 1 }} />

      <NavIcon
        icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
        onClick={onToggleDark}
        tooltip={darkMode ? 'Light mode' : 'Dark mode'}
      />
    </div>
  )
}
