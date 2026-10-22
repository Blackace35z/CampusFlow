
import { useEffect, useState } from 'react'

type ApiStatusResponse = {
  status: string
  application: string
}

function ApiStatus() {
  const [status, setStatus] = useState('Checking connection...')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function checkApi() {
      try {
        const response = await fetch(
          'http://127.0.0.1:8000/api/health',
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error('The API returned an error.')
        }

        const data: ApiStatusResponse = await response.json()

        setStatus(`${data.application} API is ${data.status}`)
        setIsConnected(true)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setStatus('API connection failed')
        setIsConnected(false)
      }
    }

    checkApi()

    return () => controller.abort()
  }, [])

  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm ${
        isConnected
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-white text-slate-600'
      }`}
    >
      <span className="font-semibold">Backend status: </span>
      {status}
    </div>
  )
}

export default ApiStatus
