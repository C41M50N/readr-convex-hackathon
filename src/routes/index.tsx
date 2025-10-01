import { ContentCard } from '@/components/content-card'
import { SignInButton, useUser } from '@clerk/clerk-react'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      ...convexQuery(api.content.getInboxContent, {}),
      gcTime: 10000,
    })
    return null
  },
  component: App,
})

function App() {
  const { isSignedIn } = useUser()
  const { data: contents } = useSuspenseQuery(convexQuery(api.content.getInboxContent, {}))

  if (!isSignedIn) {
    return (
      <SignInButton />
    )
  }

  return (
    <div className="p-4 flex flex-row gap-4">
      {contents.length === 0 ? (
        <div className="text-center text-gray-500">No content found. Add some content to get started!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {contents.map(content => (
            <ContentCard key={content._id} content={content} />
          ))}
        </div>
      )}
    </div>
  )
}
