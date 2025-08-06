import { processChatMessage } from '@/app/actions/chat'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

// Server Component that handles chat via form submission
export default async function EmergencyChatPage() {
  // Check authentication server-side
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/')
  }

  // Server Action to handle form submission
  async function handleChatSubmission(formData: FormData) {
    'use server'
    
    const message = formData.get('message') as string
    if (!message?.trim()) return
    
    const result = await processChatMessage(message.trim())
    
    // In a real implementation, you'd store this in the database
    // For now, we'll just log it
    console.log('Chat result:', result)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-400 mb-2">🌵 CactAI Emergency Chat</h1>
          <p className="text-gray-400">
            Form-based chat using Server Actions (bypasses API route issues)
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Authenticated as: {user.email}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <form action={handleChatSubmission} className="space-y-4">
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Your Message:
              </label>
              <textarea
                id="message"
                name="message"
                placeholder="Ask me anything..."
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-400 focus:outline-none resize-none"
                rows={4}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>🌱</span>
              Send Message & Plant Trees
            </button>
          </form>

          <div className="mt-6 text-sm text-gray-400">
            <p>✅ This chat uses Server Actions directly</p>
            <p>✅ Bypasses all API route issues</p>
            <p>✅ Database trigger creates profiles automatically</p>
            <p>🌳 Each message plants ~0.001 trees for the environment!</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a 
            href="/chat" 
            className="text-blue-400 hover:text-blue-300 underline"
          >
            ← Back to Regular Chat (if it works)
          </a>
        </div>
      </div>
    </div>
  )
}