import { MagicLinkForm } from '@/components/features/auth/MagicLinkForm'

export const metadata = {
  title: 'Sign in — Reading List Vote',
}

/**
 * SignInPage — magic-link email entry screen.
 * Centered card layout per wireframe 1.
 *
 * Ticket: AIEX-813
 */
export default function SignInPage() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-12">
      {/* Hero text above the card */}
      <div className="text-center mb-10 animate-fade-up">
        <h1 className="font-sans font-black text-4xl md:text-5xl text-zinc-950 mb-3 leading-tight">
          Reading List Vote
        </h1>
        <div className="h-0.5 w-12 bg-lime-400 rounded-full mx-auto mb-4" />
        <p className="font-sans font-bold text-2xl text-zinc-950">
          Pick the book.
        </p>
        <p className="font-sans font-bold text-2xl text-zinc-950">
          Honestly.
        </p>
      </div>

      {/* Sign-in card */}
      <MagicLinkForm />
    </div>
  )
}
