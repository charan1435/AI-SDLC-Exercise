-- Fix missing DELETE RLS policy on rounds table
-- Run this in Supabase SQL Editor if migrations haven't been applied

-- Drop existing policy if it exists (in case it's already partially there)
DROP POLICY IF EXISTS "rounds_delete_organizer" ON public.rounds;

-- Create the DELETE policy
CREATE POLICY "rounds_delete_organizer"
  ON public.rounds
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_organizer = true
    )
  );
