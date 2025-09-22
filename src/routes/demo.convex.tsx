import { useConvexAction } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/demo/convex')({
  component: App,
})

function App() {
  const [url, setUrl] = React.useState('')
  const ingest = useConvexAction(api.content.ingest)

  async function handleIngest() {
    await ingest({ url })
  }

  return (
    <div className="p-4 flex flex-row gap-4">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
        className="w-lg border p-2 rounded"
      />
      <button type='button' onClick={handleIngest} className="px-4 bg-blue-500 text-white p-2 rounded">
        Ingest
      </button>
    </div>
  )
}
