'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface DashboardNavbarProps {
  userEmail: string
}

export default function DashboardNavbar({ userEmail }: DashboardNavbarProps) {
  const pathname = usePathname()
  const isMeetingPage = pathname?.includes('/meeting')

  if (isMeetingPage) {
    return null
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
              MorphAI
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">{userEmail}</span>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}

