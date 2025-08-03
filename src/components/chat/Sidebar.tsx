'use client'

import { useState } from 'react'
import { TreePine, Plus, MessageSquare, Settings, LogOut, Edit2, Trash2 } from 'lucide-react'

interface SidebarProps {
  totalTrees: number
  onNewChat: () => void
  onSignOut: () => void
}

export default function Sidebar({ totalTrees, onNewChat, onSignOut }: SidebarProps) {
  const [recentChats] = useState([
    { id: '1', title: 'How to reduce carbon footprint?', timestamp: '2 hours ago' },
    { id: '2', title: 'Climate change solutions', timestamp: '1 day ago' },
    { id: '3', title: 'Renewable energy options', timestamp: '3 days ago' },
  ])

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🌵</span>
          <h1 className="text-xl font-bold text-green-400">CactAI</h1>
        </div>
        
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New chat</span>
        </button>
      </div>

      {/* Tree Counter */}
      <div className="p-4 border-b border-gray-700">
        <div className="bg-green-900/30 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TreePine className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-semibold">Trees Planted</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {totalTrees >= 1 
              ? totalTrees.toFixed(2)
              : totalTrees >= 0.1
              ? totalTrees.toFixed(3)
              : totalTrees >= 0.001
              ? totalTrees.toFixed(4)
              : totalTrees > 0
              ? `${(totalTrees * 1000).toFixed(1)} milli`
              : '0'
            }
          </div>
          <div className="text-sm text-gray-400">
            {totalTrees >= 1 
              ? 'Trees planted! 🌳'
              : totalTrees >= 0.001
              ? 'Growing your forest 🌱'
              : totalTrees > 0
              ? 'Every chat helps! 🌱'
              : 'Start chatting to plant trees 🌱'
            }
          </div>
        </div>
      </div>

      {/* Recent Chats */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Recent</h3>
          <div className="space-y-1">
            {recentChats.map((chat) => (
              <div
                key={chat.id}
                className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{chat.title}</div>
                    <div className="text-xs text-gray-400">{chat.timestamp}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button className="p-1 hover:bg-gray-700 rounded">
                    <Edit2 className="w-3 h-3 text-gray-400" />
                  </button>
                  <button className="p-1 hover:bg-gray-700 rounded">
                    <Trash2 className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-700">
        <div className="space-y-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Log out</span>
          </button>
        </div>
      </div>
    </div>
  )
}