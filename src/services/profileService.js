import { supabase } from '../lib/supabaseClient'

export const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error?.code === 'PGRST116') {
    return null
  }

  if (error) {
    throw error
  }

  return data
}

export const createProfile = async (profile) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export const updateProfileNickname = async (userId, nickname) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      nickname,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export const upsertProfile = async (profile) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
