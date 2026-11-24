import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://supabase.co";
const supabaseAnonKey = "sb_publishable_iHc5YvUoYVDmWhKVr-2K9w__6tTBTvS";

export const isSupabaseConfigured = true;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
