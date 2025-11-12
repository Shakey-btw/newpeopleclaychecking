import { createClient } from '@supabase/supabase-js'

// Get Supabase URL and key from environment variables
// In Next.js, environment variables accessible in the browser must be prefixed with NEXT_PUBLIC_
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://micgjeldkzqxpexbxqfm.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseAnonKey) {
  console.warn('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Supabase client may not work correctly.')
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common operations
export const supabaseHelpers = {
  // Query organizations
  async getOrganizations(limit: number = 100) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(limit)
    
    if (error) throw error
    return data
  },

  // Insert organization
  async insertOrganization(org: Record<string, any>) {
    const { data, error } = await supabase
      .from('organizations')
      .insert(org)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update organization
  async updateOrganization(id: number | string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete organization
  async deleteOrganization(id: number | string) {
    const { data, error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
}

