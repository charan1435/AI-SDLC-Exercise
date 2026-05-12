# Optional Skill: Realtime (Supabase Realtime)

## Activate when
Spec mentions: live updates, real-time, notifications, chat,
collaborative, feed, live dashboard

## Stack Addition
  No extra packages — Supabase JS SDK includes Realtime

## Realtime Pattern
  ```typescript
  'use client'
  import { useEffect, useState } from 'react'
  import { createBrowserClient } from '@supabase/ssr'

  export function useRealtimeTable<T>(table: string, filter?: string) {
    const [data, setData] = useState<T[]>([])
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
      const channel = supabase
        .channel(`${table}-changes`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setData(prev => [...prev, payload.new as T])
            }
            if (payload.eventType === 'DELETE') {
              setData(prev => prev.filter((item: any) => item.id !== payload.old.id))
            }
            if (payload.eventType === 'UPDATE') {
              setData(prev => prev.map((item: any) =>
                item.id === payload.new.id ? payload.new as T : item
              ))
            }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }, [table])

    return data
  }
  ```

## Supabase Dashboard Setup Required
  Enable Realtime on each table:
  Database → Replication → enable for each table that needs it

## Rules
  ✅ Always unsubscribe on component unmount (return cleanup)
  ✅ Use RLS — Realtime respects row-level security
  ❌ Do not use Realtime for high-frequency updates (>10/sec)
  ❌ Do not subscribe to entire tables in production without filters
