'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Inbox,
  User as UserIcon,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils';
import type { Conversation, Message } from '@ilovefdl/shared';

type ViewMode = 'list' | 'conversation';

export default function UserMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getConversations();
      setConversations(res.data);
    } catch {
      // No conversations yet — that's fine
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetchConversations();
  }, [user, authLoading, fetchConversations]);

  useEffect(() => {
    if (viewMode === 'conversation') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages, viewMode]);

  async function openConversation(conversation: Conversation) {
    setLoadingConversation(true);
    setError(null);
    try {
      const res = await api.getConversation(conversation.id);
      setActiveConversation(res.data);
      setViewMode('conversation');
      setMessageBody('');
    } catch {
      setError('Failed to load conversation.');
    } finally {
      setLoadingConversation(false);
    }
  }

  function backToList() {
    setViewMode('list');
    setActiveConversation(null);
    setMessageBody('');
    fetchConversations();
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConversation || !messageBody.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.sendMessage(activeConversation.id, {
        body: messageBody.trim(),
      });
      setActiveConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), res.data],
          lastMessageAt: res.data.createdAt,
        };
      });
      setMessageBody('');
    } catch {
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  function getOtherParticipantName(conversation: Conversation): string {
    if (!conversation.participants || !user) return 'Unknown';
    const other = conversation.participants.find((p) => p.userId !== user.id);
    return other?.user?.name || other?.user?.email || 'Unknown';
  }

  function getLastMessagePreview(conversation: Conversation): string {
    if (!conversation.messages || conversation.messages.length === 0) {
      return 'No messages yet';
    }
    const last = conversation.messages[conversation.messages.length - 1];
    return last.body.length > 80 ? last.body.slice(0, 80) + '...' : last.body;
  }

  function formatMessageTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  }

  // ─── Auth states ─────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-pulse text-primary/40">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <UserIcon className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">Sign In Required</h1>
          <p className="text-primary/60 mb-6">Please sign in to view your messages.</p>
          <Link href="/auth" className="btn-primary">
            Sign In
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Loading ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-white rounded w-1/4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Conversation detail view ────────────────────────────

  if (viewMode === 'conversation' && activeConversation) {
    return (
      <div className="min-h-screen bg-light flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-light">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={backToList}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="font-bold text-primary truncate">
                  {getOtherParticipantName(activeConversation)}
                </h2>
                {activeConversation.subject && (
                  <p className="text-xs text-primary/50 truncate">
                    {activeConversation.subject}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                <span className="text-sm">{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeConversation.messages && activeConversation.messages.length > 0 ? (
              activeConversation.messages.map((msg: Message) => {
                const isMe = msg.senderId === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        isMe
                          ? 'bg-accent text-white rounded-br-md'
                          : 'bg-white border border-light text-primary rounded-bl-md'
                      }`}
                    >
                      {!isMe && msg.sender?.name && (
                        <p className="text-xs font-medium text-primary/50 mb-1">
                          {msg.sender.name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p
                        className={`text-[10px] mt-1.5 ${
                          isMe ? 'text-white/60' : 'text-primary/40'
                        }`}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-primary/40">No messages in this conversation yet.</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Compose */}
        <div className="bg-white border-t border-light">
          <form
            onSubmit={handleSendMessage}
            className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-3"
          >
            <input
              type="text"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 input-field"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !messageBody.trim()}
              className="btn-primary px-4 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Conversation list ───────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/account"
              className="flex items-center gap-1.5 text-xs text-primary/40 hover:text-primary/60 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              Account
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-primary mb-1">Messages</h1>
          <p className="text-sm text-primary/60">
            Your conversations with vendors and stores
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                disabled={loadingConversation}
                className="w-full bg-white rounded-xl border border-light p-4 hover:shadow-md transition-shadow text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-primary truncate">
                      {getOtherParticipantName(conv)}
                    </p>
                    <span className="text-[11px] text-primary/40 flex-shrink-0">
                      {formatMessageTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  {conv.subject && (
                    <p className="text-xs font-medium text-primary/70 truncate mb-0.5">
                      {conv.subject}
                    </p>
                  )}
                  <p className="text-xs text-primary/50 truncate">
                    {getLastMessagePreview(conv)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-light p-12 text-center">
            <Inbox className="w-12 h-12 text-primary/20 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-primary mb-2">No messages yet</h2>
            <p className="text-sm text-primary/60 max-w-sm mx-auto">
              When you contact a vendor or store, your conversations will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
