'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SAGE_GREEN = '#6B8E6B'

export default function MarketingClient() {
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleRun = async () => {
    setRunning(true)
    setResult(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setResult('Sign in required.')
        return
      }
      setResult('Marketing prompt received. AI generation can be wired here.')
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col">
      <p className="text-sm text-slate-600 mb-4">
        Describe your campaign or audience and generate marketing copy.
      </p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. Promote my new ceramic collection to collectors in Seoul..."
        rows={6}
        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-[#6B8E6B] focus:border-transparent outline-none"
      />
      {result != null && (
        <p className="mt-3 text-sm text-slate-600">{result}</p>
      )}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: SAGE_GREEN }}
        >
          {running ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
