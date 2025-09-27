import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConvexAction } from '@convex-dev/react-query'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [url, setUrl] = React.useState('')
  const { mutateAsync: ingest, isPending: isIngesting } = useMutation({
    mutationFn: useConvexAction(api.ingestion.index.ingest),
    onSuccess: () => {
      console.log('Ingestion started successfully!')
    }
  })

  async function handleIngest() {
    await ingest({ url })
  }

  return (
    <div className="p-4 flex flex-row gap-4">
      <Input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
        className="w-lg"
      />
      <Button onClick={handleIngest} disabled={isIngesting}>
        {isIngesting ? 'Ingesting...' : 'Ingest'}
      </Button>
    </div>
  )
}
