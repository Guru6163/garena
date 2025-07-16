import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * You MUST set these in your project settings when you deploy:
 *
 *  NEXT_PUBLIC_SUPABASE_URL
 *  NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * The guard below only prevents crashes in the local/preview build.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co" // ⚠️ replace in production

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key" // ⚠️ replace in production

if (SUPABASE_URL === "https://placeholder.supabase.co" || SUPABASE_ANON_KEY === "public-anon-key") {
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] Environment variables not found – using placeholder credentials. " +
      "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "in your Vercel project settings.",
  )
}

/** Shared singleton client */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* Domain types re-exported for convenience */
export type User = {
  id: number
  name: string
  phone?: string
  email?: string
  created_at: string
  is_active: boolean
}

export type Game = {
  id: number
  name: string
  rate: number
  rate_type: "30min" | "hour"
  is_active: boolean
  created_at: string
}

export type Session = {
  id: number
  user_id: number
  game_id: number
  start_time: string
  end_time?: string
  is_active: boolean
  created_at: string
  users?: User
  games?: Game
  bill_details?: string | { total?: number; [key: string]: any }
}
