'use client'

import { useState, useEffect, useCallback } from 'react'
import { TreePine, Plus, MessageSquare, Settings, LogOut, Edit2, Trash2 } from 'lucide-react'
import type { ChatSession } from '@/types'

// Utility to join class names cleanly
const cn = (...classes: string[]) => classes.filter(Boolean).join(' ')

interface SidebarProps {
  totalTrees: number
  onNewChat: () => void
  onSignOut: () => void
  userId: string
  currentSessionId?: string | null
  onSessionSelect?: (sessionId: string) => void
  onRefreshSessions?: (refreshFn: () => void) => void
}


// Utility functions for tree count formatting
function formatTreeCount(trees: number): string {
  if (trees >= 1) return trees.toFixed(2)
  if (trees >= 0.1) return trees.toFixed(3)
  if (trees >= 0.001) return trees.toFixed(4)
  if (trees > 0) return `${(trees * 1000).toFixed(1)} milli`
  return '0'
}

function getTreeMessage(trees: number): string {
  if (trees >= 1) return 'Trees planted! 🌳'
  if (trees >= 0.001) return 'Growing your forest 🌱'
  if (trees > 0) return 'Every chat helps! 🌱'
  return 'Start chatting to plant trees 🌱'
}

export default function Sidebar({ totalTrees, onNewChat, onSignOut, userId, currentSessionId, onSessionSelect, onRefreshSessions }: SidebarProps) {
  const [recentChats, setRecentChats] = useState<ChatSession[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')


  const loadChatSessions = useCallback(() => {
    console.log('📝 Loading static mock sessions')
    setIsLoadingChats(true)
    
    // Use static mock data to prevent infinite loops
    const sessions = [
      {
        id: 'mock-1',
        user_id: userId,
        title: 'Current Chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-2', 
        user_id: userId,
        title: 'Previous Chat',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'mock-3',
        user_id: userId,
        title: 'Earlier Chat', 
        created_at: new Date(Date.now() - 7200000).toISOString(),
        updated_at: new Date(Date.now() - 7200000).toISOString()
      }
    ]
    
    setRecentChats(sessions)
    setIsLoadingChats(false)
    console.log('✅ Static mock sessions loaded:', sessions.length)
  }, [userId])

  useEffect(() => {
    console.log('🔄 Sidebar: Initializing with mock data for user:', userId.substring(0, 8) + '...')
    loadChatSessions()
  }, [loadChatSessions, userId])

  // Expose refresh function for manual refresh
  useEffect(() => {
    if (onRefreshSessions) {
      onRefreshSessions(loadChatSessions)
    }
  }, [onRefreshSessions, loadChatSessions])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const handleEditStart = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId)
    setEditingTitle(currentTitle)
  }

  const handleEditSave = async (chatId: string) => {
    // For mock data, just update local state
    setRecentChats(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, title: editingTitle } : chat
      )
    )
    setEditingChatId(null)
    setEditingTitle('')
  }

  const handleEditCancel = () => {
    setEditingChatId(null)
    setEditingTitle('')
  }

  const handleDeleteChat = async (chatId: string) => {
    // For mock data, just remove from local state
    setRecentChats(prev => prev.filter(chat => chat.id !== chatId))
    
    // If we deleted the current session, start a new chat
    if (currentSessionId === chatId) {
      onNewChat()
    }
  }

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
            {formatTreeCount(totalTrees)}
          </div>
          <div className="text-sm text-gray-400">
            {getTreeMessage(totalTrees)}
          </div>
        </div>
      </div>

      {/* Recent Chats */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Recent</h3>
          <div className="space-y-1">
            {isLoadingChats ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-700 rounded animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-700 rounded animate-pulse mb-1"></div>
                      <div className="h-2 bg-gray-700 rounded animate-pulse w-16"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : recentChats.length === 0 ? (
              // Empty state
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No conversations yet</p>
                <p className="text-xs text-gray-600">Start chatting to see your history</p>
              </div>
            ) : (
              // Chat list
              recentChats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer",
                    currentSessionId === chat.id ? 'bg-gray-800' : ''
                  )}
                  onClick={() => onSessionSelect?.(chat.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleEditSave(chat.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(chat.id)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                          className="text-sm bg-gray-700 text-white px-2 py-1 rounded w-full"
                          autoFocus
                        />
                      ) : (
                        <>
                          <div className="text-sm text-white truncate">{chat.title}</div>
                          <div className="text-xs text-gray-400">{formatTimestamp(chat.created_at)}</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditStart(chat.id, chat.title)
                      }}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <Edit2 className="w-3 h-3 text-gray-400" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteChat(chat.id)
                      }}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
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