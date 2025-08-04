'use client'

import { useState } from 'react'

export default function ChatAPIPage() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // This will make a direct request to test if the issue is with routing
    try {
      const result = await fetch('/api/simple-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      
      if (result.ok) {
        const data = await result.json()
        setResponse(JSON.stringify(data, null, 2))
      } else {
        setResponse(`Error: ${result.status} - ${result.statusText}`)
      }
    } catch (error) {
      setResponse(`Network Error: ${error}`)
    }
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">API Test Page</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Test message"
          className="p-2 text-black mr-2"
        />
        <button type="submit" className="bg-blue-500 p-2 rounded">
          Test API
        </button>
      </form>
      
      {response && (
        <div className="bg-gray-800 p-4 rounded">
          <h2>Response:</h2>
          <pre>{response}</pre>
        </div>
      )}
      
      <div className="mt-4">
        <h2>Direct Links:</h2>
        <p><a href="/api/test-endpoint" className="text-blue-400" target="_blank">GET /api/test-endpoint</a></p>
        <p><a href="/api/simple-chat" className="text-blue-400" target="_blank">GET /api/simple-chat</a></p>
      </div>
    </div>
  )
}