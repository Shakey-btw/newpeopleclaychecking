// Test Supabase connection
// This is a temporary test file - you can delete it after testing

"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState<string>('Testing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        // Test 1: Check if client is initialized
        if (!supabase) {
          setStatus('❌ Supabase client not initialized')
          return
        }

        setStatus('✅ Supabase client initialized')

        // Test 2: Try a simple query (this will fail if tables don't exist, but connection works)
        const { data, error: queryError } = await supabase
          .from('organizations')
          .select('count')
          .limit(1)

        if (queryError) {
          // This is expected if the table doesn't exist yet
          if (queryError.code === 'PGRST116') {
            setStatus('✅ Connection works! (Table "organizations" does not exist yet - this is normal)')
          } else {
            setError(`Query error: ${queryError.message}`)
            setStatus('⚠️ Connection works but query failed')
          }
        } else {
          setStatus('✅ Connection and query successful!')
        }
      } catch (err: any) {
        setError(err.message)
        setStatus('❌ Connection failed')
      }
    }

    testConnection()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Supabase Connection Test</h2>
      <p><strong>Status:</strong> {status}</p>
      {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
      <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
        Check the browser console for more details.
      </p>
    </div>
  )
}
