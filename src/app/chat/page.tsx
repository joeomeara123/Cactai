import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createDatabaseClient } from '@/lib/database'
import ChatInterface from '@/components/chat/ChatInterface'

export default async function ChatPage() {
  // Check authentication
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/')
  }

  // Get user profile
  const dbClient = createDatabaseClient(supabase)
  const userProfile = await dbClient.getUserProfile(user.id)

  if (!userProfile) {
    // This shouldn't happen with our trigger, but handle gracefully
    console.error('User profile not found for authenticated user')
    redirect('/')
  }

  return (
    <div className="h-screen">
      <ChatInterface 
        userId={user.id} 
        userProfile={userProfile}
      />
    </div>
  )
}