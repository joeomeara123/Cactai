// Temporarily disabled Supabase to test basic functionality
// import { redirect } from 'next/navigation'
// import { createServerSupabaseClient } from '@/lib/supabase-server'
// import { DatabaseClient } from '@/lib/database'
// import AuthButton from '@/components/auth/AuthButton'

export default function Home() {
  // Temporarily disabled authentication check to test if this is the issue
  // const supabase = await createServerSupabaseClient()
  // const { data: { user } } = await supabase.auth.getUser()

  // if (user) {
  //   const db = new DatabaseClient(supabase)
  //   await db.getOrCreateUserProfile({
  //     id: user.id,
  //     email: user.email!,
  //     full_name: user.user_metadata?.full_name || user.user_metadata?.name,
  //     avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  //   })
  //   redirect('/chat')
  // }
  return (
    <div className="font-sans min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌵</span>
          <h1 className="text-xl font-bold text-green-400">CactAI</h1>
        </div>
        {/* <AuthButton /> */}
        <div className="px-4 py-2 bg-green-600 text-white rounded-lg">
          Sign In (Disabled for Testing)
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              The Social Good LLM 🌱
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Like Ecosia for AI conversations. Every query you make helps plant trees!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-semibold text-green-400 mb-2">AI Powered</h3>
              <p className="text-sm text-gray-300">
                Access GPT-4 and other leading AI models
              </p>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
              <div className="text-2xl mb-2">🌳</div>
              <h3 className="font-semibold text-green-400 mb-2">Plant Trees</h3>
              <p className="text-sm text-gray-300">
                40% of revenue goes directly to reforestation
              </p>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-green-400 mb-2">Track Impact</h3>
              <p className="text-sm text-gray-300">
                See exactly how many trees your queries have planted
              </p>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
            <h3 className="font-semibold text-white mb-2">How it Works</h3>
            <p className="text-sm text-gray-300">
              Every query costs ~£0.04 to process. We donate 40% (£0.016) to environmental causes. 
              At £1 = 2.5 trees, this means ~0.04 trees planted per query!
            </p>
          </div>

          <div className="pt-6">
            <p className="text-sm text-gray-400">
              Sign in with Google to start chatting and planting trees! 🌱
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-400 border-t border-gray-800">
        <p>CactAI - Growing a better future, one conversation at a time 🌵</p>
      </footer>
    </div>
  )
}