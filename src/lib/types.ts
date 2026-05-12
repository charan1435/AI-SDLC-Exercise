// ─────────────────────────────────────────────────────────────────────────────
// Application entity types
// ─────────────────────────────────────────────────────────────────────────────

export type RoundStatus = 'open' | 'closed'

export interface User {
  id: string
  email: string
  display_name: string
  is_organizer: boolean
  created_at: string
  updated_at: string
}

export interface Round {
  id: string
  title: string
  closing_date: string
  status: RoundStatus
  winner_proposal_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Proposal {
  id: string
  round_id: string
  title: string
  author: string
  reason: string | null
  proposer_id: string
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  proposal_id: string
  voter_id: string
  round_id: string
  created_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate / query-layer shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface ProposalWithTally extends Proposal {
  vote_count: number
  /** The current user's vote row id for this proposal, or null if not voted */
  my_vote_id: string | null
  /** Display name of the proposer (joined from users table) */
  proposer_display_name: string
}

export interface RoundDetail {
  round: Round
  proposals: ProposalWithTally[]
  winner: ProposalWithTally | null
  my_vote_count: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Database generic type
// All Insert / Update shapes are explicit to avoid TypeScript inference issues
// with the Supabase SDK's complex overloaded generics.
// ─────────────────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string
          is_organizer: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string
          is_organizer?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          display_name?: string
          is_organizer?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rounds: {
        Row: {
          id: string
          title: string
          closing_date: string
          status: string
          winner_proposal_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          closing_date: string
          status?: string
          winner_proposal_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          closing_date?: string
          status?: string
          winner_proposal_id?: string | null
          created_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          id: string
          round_id: string
          title: string
          author: string
          reason: string | null
          proposer_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          round_id: string
          title: string
          author: string
          reason?: string | null
          proposer_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          author?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          proposal_id: string
          voter_id: string
          round_id: string
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          voter_id: string
          round_id: string
          created_at?: string
        }
        Update: {
          proposal_id?: string
          voter_id?: string
          round_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, unknown>
        Relationships: []
      }
    }
    Functions: {
      round_tally: {
        Args: { round_id: string }
        Returns: Array<{ proposal_id: string; vote_count: number }>
      }
    }
    Enums: {
      round_status: 'open' | 'closed'
    }
    CompositeTypes: Record<string, never>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API response shape
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Error message constants (the 4 server guardrails + others)
// Used by route handlers, server actions, AND the frontend toast mapper.
// ─────────────────────────────────────────────────────────────────────────────

export const ERROR_MESSAGES = {
  VOTE_CEILING: 'You have used all 3 votes — withdraw one to vote again.',
  DUPLICATE_VOTE: 'You already voted for this book.',
  ROUND_CLOSED: 'This round is closed.',
  PROPOSAL_NOT_FOUND: 'Proposal not found.',
  ROUND_ALREADY_OPEN: 'A round is already open — close it first.',
  ROUND_NOT_FOUND: 'Round not found.',
  UNAUTHORIZED: 'You are not authorised to perform this action.',
  UNAUTHENTICATED: 'You must be signed in.',
  VALIDATION_ERROR: 'Invalid input.',
} as const
