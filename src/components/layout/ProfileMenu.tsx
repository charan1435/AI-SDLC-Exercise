'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, LogOut, PlusCircle } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'

interface ProfileMenuProps {
  displayName: string
  isOrganizer: boolean
}

export function ProfileMenu({ displayName, isOrganizer }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-zinc-100 hover:bg-zinc-200 transition-colors duration-150 font-sans font-semibold text-sm text-zinc-950"
      >
        <span className="max-w-[120px] truncate">{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-[1.5rem] shadow-hero ring-1 ring-zinc-100 py-2 z-50">
          {isOrganizer && (
            <Link
              href="/rounds/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
            >
              <PlusCircle className="h-4 w-4 text-lime-600" />
              Open a round
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
            >
              <LogOut className="h-4 w-4 text-zinc-400" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
