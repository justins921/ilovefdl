'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Plus,
  X,
  Loader2,
  Inbox,
  User as UserIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils';
import type { Conversation, Message } from '@ilovefdl/shared';

type ViewMode = 'list' | 'conversation' | 'new';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Message compose
  const [messageBody, setMessageBody] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New conversation form
  const [newRecipientId, setNewRecipientId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) api.setToken(tokenStr);

      const res = await api.getConversations();
      setConversations(res.data);
    } catch {
      setError('Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (viewMode === 'conversation') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages, viewMode]);

  // ─── Open Conversation ───────────────────────────────────

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

  // ─── Send Message ────────────────────────────────────────

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

  // ─── New Conversation ────────────────────────────────────

  function openNewConversation() {
    setNewRecipientId('');
    setNewSubject('');
    setNewBody('');
    setError(null);
    setViewMode('new');
  }

  async function handleCreateConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!newRecipientId.trim() || !newBody.trim()) return;

    setCreatingConversation(true);
    setError(null);

    try {
      const res = await api.createConversation({
        recipientId: newRecipientId.trim(),
        subject: newSubject.trim() || undefined,
        body: newBody.trim(),
      });
      setActiveConversation(res.data);
      setViewMode('conversation');
      setMessageBody('');
      await fetchConversations();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create conversation.';
      setError(message);
    } finally {
      setCreatingConversation(false);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────

  function getConversationTitle(conversation: Conversation): string {
    if (conversation.subject) return conversation.subject;
    if (conversation.orderId) return `Order #${conversation.orderId.slice(0, 8)}`;
    return 'Conversation';
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

  // ─── Loading State ───────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── New Conversation View ───────────────────────────────

  if (viewMode === 'new') {
    return (
      <div className="min-h-screen bg-light">
        {/* Header */}
        <div className="bg-white border-b border-light">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4">
              <button
                onClick={backToList}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                  New Conversation
                </h1>
                <p className="text-sm sm:text-base text-primary/60">
                  Start a new conversation with a customer or vendor
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleCreateConversation}
            className="bg-white rounded-xl border border-light p-6 space-y-5"
          >
            {/* Recipient ID */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Recipient ID <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                value={newRecipientId}
                onChange={(e) => setNewRecipientId(e.target.value)}
                placeholder="Enter user ID"
                className="input-field"
                required
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Optional subject line"
                className="input-field"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Message <span className="text-accent">*</span>
              </label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Write your message..."
                rows={6}
                className="input-field resize-none"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-light">
              <button
                type="button"
                onClick={backToList}
                className="px-5 py-2.5 text-sm font-medium text-primary/60 hover:text-primary rounded-lg hover:bg-light transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingConversation || !newRecipientId.trim() || !newBody.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed justify-center"
              >
                {creatingConversation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── Conversation Detail View ────────────────────────────

  if (viewMode === 'conversation' && activeConversation) {
    const messages = activeConversation.messages || [];

    return (
      <div className="min-h-screen bg-light flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-light flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={backToList}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-primary truncate">
                  {getConversationTitle(activeConversation)}
                </h1>
                <p className="text-sm text-primary/60">
                  with {getOtherParticipantName(activeConversation)}
                  {activeConversation.orderId && (
                    <span className="ml-2 text-primary/40">
                      -- Order #{activeConversation.orderId.slice(0, 8)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                <span className="text-sm">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {loadingConversation ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary/30 mx-auto mb-3" />
                <p className="text-sm text-primary/50">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center">
                <MessageSquare className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                <p className="text-sm text-primary/50">
                  No messages yet. Send the first message below.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[75%] ${
                        isMine
                          ? 'order-2'
                          : 'order-1'
                      }`}
                    >
                      {/* Sender name */}
                      <div
                        className={`flex items-center gap-2 mb-1 ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isMine && (
                          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                            <UserIcon className="w-3 h-3 text-accent" />
                          </div>
                        )}
                        <span className="text-xs text-primary/50">
                          {msg.sender?.name || (isMine ? 'You' : 'Unknown')}
                        </span>
                        <span className="text-xs text-primary/30">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>

                      {/* Message bubble */}
                      <div
                        className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
                          isMine
                            ? 'bg-teal text-white rounded-tr-sm'
                            : 'bg-white border border-light text-primary rounded-tl-sm'
                        }`}
                      >
                        {msg.body}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-light flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <form onSubmit={handleSendMessage} className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (messageBody.trim()) {
                        handleSendMessage(e);
                      }
                    }
                  }}
                  placeholder="Type your message..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={sending || !messageBody.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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
      </div>
    );
  }

  // ─── Conversation List View ──────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                Messages
              </h1>
              <p className="text-sm sm:text-base text-primary/60">
                Communicate with customers and resolve inquiries
              </p>
            </div>
            <button onClick={openNewConversation} className="btn-primary w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Conversation
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Conversation List */}
        {conversations.length > 0 ? (
          <div className="bg-white rounded-xl border border-light overflow-hidden divide-y divide-light">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => openConversation(conversation)}
                disabled={loadingConversation}
                className="w-full text-left px-6 py-4 hover:bg-light/50 transition-colors flex items-center gap-4 disabled:opacity-50"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-accent" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-primary truncate">
                      {getConversationTitle(conversation)}
                    </h3>
                    <span className="text-xs text-primary/40 flex-shrink-0">
                      {formatMessageTime(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-sm text-primary/50 truncate">
                      {getOtherParticipantName(conversation)}
                      {conversation.messages && conversation.messages.length > 0 && (
                        <span className="text-primary/40">
                          {' -- '}{getLastMessagePreview(conversation)}
                        </span>
                      )}
                    </p>
                    {conversation.unreadCount != null && conversation.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white text-xs font-bold flex-shrink-0">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl border border-light p-16 text-center">
            <Inbox className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">
              No conversations yet
            </h2>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              Start a conversation with a customer or respond to incoming
              messages. All your conversations will appear here.
            </p>
            <button onClick={openNewConversation} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Start a Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
