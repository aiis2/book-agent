import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


function vendorChunkName(id: string) {
  const [, modulePath = ''] = id.split('node_modules/')
  const segments = modulePath.split('/')
  const packageName = segments[0]?.startsWith('@')
    ? `${segments[0]}/${segments[1]}`
    : segments[0]

  if (!packageName) {
    return 'vendor-misc'
  }

  if (packageName === 'react' || packageName === 'react-dom') {
    return 'vendor-react'
  }

  if (packageName === 'antd' || packageName === '@ant-design/icons') {
    return 'vendor-antd'
  }

  return `vendor-${packageName.replace(/[\/@]/g, '-')}`
}


export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules/')) {
            return undefined
          }

          return vendorChunkName(id)
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4319',
        changeOrigin: true,
      },
    },
  },
})
