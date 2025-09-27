import { Link } from '@tanstack/react-router'

import ClerkHeader from '../integrations/clerk/header-user.tsx'

export default function Header() {
  return (
    <header className="p-2 flex gap-2 bg-white text-black justify-between">
      <div>
        <ClerkHeader />
      </div>
    </header>
  )
}
