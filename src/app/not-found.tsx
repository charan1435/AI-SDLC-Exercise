import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Custom 404 page matching the app aesthetic.
 *
 * Ticket: AIEX-835
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-12">
      <div className="bg-white rounded-card p-10 shadow-card max-w-sm w-full text-center flex flex-col items-center gap-6 animate-fade-up">
        <span className="font-sans font-black text-8xl text-zinc-100 leading-none select-none">
          404
        </span>
        <div>
          <h1 className="font-sans font-extrabold text-2xl text-zinc-950 mb-2">
            Page not found.
          </h1>
          <p className="font-sans text-base text-zinc-600 leading-relaxed">
            The round or page you&apos;re looking for doesn&apos;t exist or
            has been removed.
          </p>
        </div>
        <Button variant="primary" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
