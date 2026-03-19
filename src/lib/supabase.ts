import { createClient } from '@supabase/supabase-js';

// Set these in your .env file:
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export const signIn = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUp = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signUp({ email, password });
};

export const signOut = async () => {
  if (!supabase) return;
  return supabase.auth.signOut();
};

export const getSession = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const onAuthStateChange = (callback: (session: any) => void) => {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
};

// ─── Cloud sync helpers ───────────────────────────────────────────────────────

export const syncStateToCloud = async (userId: string, state: object) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('app_state')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
  if (error) console.warn('[Supabase] sync error:', error.message);
};

export const loadStateFromCloud = async (userId: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('app_state')
    .select('state')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data?.state ?? null;
};

export const uploadProgressPhoto = async (
  userId: string,
  photoId: string,
  blob: Blob
): Promise<string | null> => {
  if (!supabase) return null;
  const path = `${userId}/progress/${photoId}.jpg`;
  const { error } = await supabase.storage
    .from('progress-photos')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) { console.warn('[Supabase] photo upload error:', error.message); return null; }
  const { data } = supabase.storage.from('progress-photos').getPublicUrl(path);
  return data.publicUrl;
};
