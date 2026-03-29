import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 使用 process.env 替代 import.meta.env 用于 Electron 环境
const url = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) as
  | string
  | undefined
const key = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) as
  | string
  | undefined

let supabase: SupabaseClient | null = null
if (url && key) {
  supabase = createClient(url, key)
}

export default supabase
