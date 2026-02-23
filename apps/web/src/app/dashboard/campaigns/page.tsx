'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Send,
  Clock,
  Mail,
  Smartphone,
  Eye,
  BarChart3,
  Users,
  MousePointerClick,
  Calendar,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils';
import type { Campaign } from '@ilovefdl/shared';
import { CampaignStatus, CampaignType } from '@ilovefdl/shared';

// ─── Types ───────────────────────────────────────────────

interface CampaignFormData {
  name: string;
  type: CampaignType;
  subject: string;
  body: string;
  audience: 'all' | 'customers' | 'subscribers';
  scheduledAt: string;
}

const emptyForm: CampaignFormData = {
  name: '',
  type: CampaignType.EMAIL,
  subject: '',
  body: '',
  audience: 'all',
  scheduledAt: '',
};

// ─── Status Badge Config ─────────────────────────────────

const STATUS_STYLES: Record<CampaignStatus, { label: string; className: string }> = {
  [CampaignStatus.DRAFT]: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  [CampaignStatus.SCHEDULED]: { label: 'Scheduled', className: 'bg-blue-50 text-blue-600' },
  [CampaignStatus.SENDING]: { label: 'Sending', className: 'bg-yellow-50 text-yellow-700' },
  [CampaignStatus.SENT]: { label: 'Sent', className: 'bg-teal/10 text-teal' },
  [CampaignStatus.CANCELLED]: { label: 'Cancelled', className: 'bg-red-50 text-red-600' },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'All Customers',
  customers: 'Past Customers',
  subscribers: 'Subscribers',
};

// ─── Helpers ─────────────────────────────────────────────

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

// ─── Component ───────────────────────────────────────────

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Send confirmation
  const [sendConfirmId, setSendConfirmId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Stats drawer
  const [statsId, setStatsId] = useState<string | null>(null);

  // ─── Fetch campaigns ──────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) api.setToken(tokenStr);

      const res = await api.getCampaigns({ limit: 100 });
      setCampaigns(res.data);
    } catch {
      setError('Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Modal helpers ─────────────────────────────────────

  function openAddModal() {
    setEditingCampaign(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(campaign: Campaign) {
    setEditingCampaign(campaign);
    setForm({
      name: campaign.name,
      type: campaign.type,
      subject: campaign.subject || '',
      body: campaign.body,
      audience: campaign.audience as CampaignFormData['audience'],
      scheduledAt: toDatetimeLocal(campaign.scheduledAt),
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCampaign(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function updateField(field: keyof CampaignFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Submit handler ────────────────────────────────────

  async function handleSubmit(e: React.FormEvent, saveAsDraft: boolean) {
    e.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError('Campaign name is required.');
      return;
    }

    if (!form.body.trim()) {
      setFormError('Campaign body is required.');
      return;
    }

    if (form.type === CampaignType.EMAIL && !form.subject.trim()) {
      setFormError('Email subject is required for email campaigns.');
      return;
    }

    const scheduledAt = fromDatetimeLocal(form.scheduledAt);

    if (!saveAsDraft && scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        setFormError('Schedule date must be in the future.');
        return;
      }
    }

    setSaving(true);

    try {
      if (editingCampaign) {
        const updatePayload: Record<string, unknown> = {
          name,
          type: form.type,
          subject: form.type === CampaignType.EMAIL ? form.subject.trim() : undefined,
          body: form.body.trim(),
          audience: form.audience,
        };

        if (saveAsDraft) {
          updatePayload.status = 'DRAFT';
        } else if (scheduledAt) {
          updatePayload.status = 'SCHEDULED';
          updatePayload.scheduledAt = scheduledAt;
        }

        const res = await api.updateCampaign(editingCampaign.id, updatePayload as Parameters<typeof api.updateCampaign>[1]);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === editingCampaign.id ? res.data : c))
        );
      } else {
        const createPayload: Record<string, unknown> = {
          name,
          type: form.type,
          body: form.body.trim(),
          audience: form.audience,
        };

        if (form.type === CampaignType.EMAIL && form.subject.trim()) {
          createPayload.subject = form.subject.trim();
        }

        if (!saveAsDraft && scheduledAt) {
          createPayload.scheduledAt = scheduledAt;
        }

        const res = await api.createCampaign(createPayload as Parameters<typeof api.createCampaign>[0]);
        setCampaigns((prev) => [res.data, ...prev]);
      }
      closeModal();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Send campaign ─────────────────────────────────────

  async function handleSend(id: string) {
    setSending(true);
    try {
      const res = await api.sendCampaign(id);
      if (res.data.sent) {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, status: CampaignStatus.SENT, sentCount: res.data.count, sentAt: new Date().toISOString() }
              : c
          )
        );
      }
      setSendConfirmId(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send campaign.';
      setError(message);
      setSendConfirmId(null);
    } finally {
      setSending(false);
    }
  }

  // ─── Cancel campaign ───────────────────────────────────

  async function handleCancel(campaign: Campaign) {
    if (!confirm('Are you sure you want to cancel this campaign?')) return;

    try {
      const res = await api.updateCampaign(campaign.id, { status: 'CANCELLED' });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? res.data : c))
      );
    } catch {
      setError('Failed to cancel campaign.');
    }
  }

  // ─── Delete campaign ───────────────────────────────────

  async function handleDelete(id: string) {
    try {
      await api.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Failed to delete campaign.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Loading state ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-12 bg-white rounded w-1/4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Megaphone className="w-7 h-7 text-accent" />
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                  Marketing Campaigns
                </h1>
              </div>
              <p className="text-primary/60 text-sm sm:text-base mt-1">
                Create and send email or SMS campaigns to your customers.
              </p>
            </div>
            <button onClick={openAddModal} className="btn-primary w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error banner */}
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

        {/* Campaigns table */}
        {campaigns.length > 0 ? (
          <div className="bg-white rounded-xl border border-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-light">
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Campaign
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Type
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4 hidden sm:table-cell">
                      Audience
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4 hidden md:table-cell">
                      Stats
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4 hidden lg:table-cell">
                      Date
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-4 sm:px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {campaigns.map((campaign) => {
                    const statusStyle = STATUS_STYLES[campaign.status];
                    const isEditable =
                      campaign.status === CampaignStatus.DRAFT ||
                      campaign.status === CampaignStatus.SCHEDULED;
                    const isSendable =
                      campaign.status === CampaignStatus.DRAFT ||
                      campaign.status === CampaignStatus.SCHEDULED;
                    const isSent = campaign.status === CampaignStatus.SENT;
                    const openRate =
                      campaign.sentCount > 0
                        ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1)
                        : '0.0';
                    const clickRate =
                      campaign.sentCount > 0
                        ? ((campaign.clickCount / campaign.sentCount) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <tr
                        key={campaign.id}
                        className="hover:bg-light/50 transition-colors"
                      >
                        {/* Campaign name */}
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <Megaphone className="w-4 h-4 text-accent" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-primary block truncate max-w-[200px]">
                                {campaign.name}
                              </span>
                              {campaign.subject && (
                                <span className="text-xs text-primary/40 block truncate max-w-[200px]">
                                  {campaign.subject}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type badge */}
                        <td className="px-4 sm:px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              campaign.type === CampaignType.EMAIL
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-purple-50 text-purple-600'
                            }`}
                          >
                            {campaign.type === CampaignType.EMAIL ? (
                              <Mail className="w-3 h-3" />
                            ) : (
                              <Smartphone className="w-3 h-3" />
                            )}
                            {campaign.type}
                          </span>
                        </td>

                        {/* Audience */}
                        <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                          <span className="text-sm text-primary/60">
                            {AUDIENCE_LABELS[campaign.audience] || campaign.audience}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 sm:px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.className}`}
                          >
                            {statusStyle.label}
                          </span>
                        </td>

                        {/* Stats */}
                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                          {isSent || campaign.sentCount > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-primary/60">
                                <Send className="w-3 h-3" />
                                <span>{campaign.sentCount} sent</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className="text-xs text-primary/40 cursor-pointer hover:text-primary/60"
                                  onClick={() =>
                                    setStatsId(statsId === campaign.id ? null : campaign.id)
                                  }
                                  title="View details"
                                >
                                  <Eye className="w-3 h-3 inline mr-1" />
                                  {openRate}%
                                </span>
                                <span className="text-xs text-primary/40">
                                  <MousePointerClick className="w-3 h-3 inline mr-1" />
                                  {clickRate}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-primary/30">&mdash;</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                          <div className="text-xs text-primary/50 space-y-0.5">
                            <p>Created: {formatDate(campaign.createdAt)}</p>
                            {campaign.scheduledAt && (
                              <p className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(campaign.scheduledAt)}
                              </p>
                            )}
                            {campaign.sentAt && (
                              <p>Sent: {formatDate(campaign.sentAt)}</p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Stats button (mobile) */}
                            {(isSent || campaign.sentCount > 0) && (
                              <button
                                onClick={() =>
                                  setStatsId(statsId === campaign.id ? null : campaign.id)
                                }
                                className="p-2 rounded-lg text-primary/50 hover:text-accent hover:bg-accent/10 transition-colors md:hidden"
                                title="View stats"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Edit */}
                            {isEditable && (
                              <button
                                onClick={() => openEditModal(campaign)}
                                className="p-2 rounded-lg text-primary/50 hover:text-accent hover:bg-accent/10 transition-colors"
                                title="Edit campaign"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {/* Send */}
                            {isSendable && (
                              <button
                                onClick={() => setSendConfirmId(campaign.id)}
                                className="p-2 rounded-lg text-primary/50 hover:text-teal hover:bg-teal/10 transition-colors"
                                title="Send campaign"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {/* Cancel scheduled */}
                            {campaign.status === CampaignStatus.SCHEDULED && (
                              <button
                                onClick={() => handleCancel(campaign)}
                                className="p-2 rounded-lg text-primary/50 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
                                title="Cancel campaign"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete */}
                            {deletingId === campaign.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(campaign.id)}
                                  className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-1 text-xs font-medium text-primary/50 bg-light rounded hover:bg-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(campaign.id)}
                                className="p-2 rounded-lg text-primary/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete campaign"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expanded stats row */}
            {statsId && (() => {
              const campaign = campaigns.find((c) => c.id === statsId);
              if (!campaign) return null;
              const openRate =
                campaign.sentCount > 0
                  ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1)
                  : '0.0';
              const clickRate =
                campaign.sentCount > 0
                  ? ((campaign.clickCount / campaign.sentCount) * 100).toFixed(1)
                  : '0.0';
              return (
                <div className="border-t border-light bg-light/50 px-4 sm:px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-primary">
                      Campaign Stats: {campaign.name}
                    </h3>
                    <button
                      onClick={() => setStatsId(null)}
                      className="text-primary/40 hover:text-primary/60"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-light text-center">
                      <Send className="w-5 h-5 text-accent mx-auto mb-1" />
                      <p className="text-lg font-bold text-primary">{campaign.sentCount}</p>
                      <p className="text-xs text-primary/50">Sent</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-light text-center">
                      <Eye className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-primary">{campaign.openCount}</p>
                      <p className="text-xs text-primary/50">Opened ({openRate}%)</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-light text-center">
                      <MousePointerClick className="w-5 h-5 text-teal mx-auto mb-1" />
                      <p className="text-lg font-bold text-primary">{campaign.clickCount}</p>
                      <p className="text-xs text-primary/50">Clicked ({clickRate}%)</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-light text-center">
                      <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-primary">
                        {AUDIENCE_LABELS[campaign.audience] || campaign.audience}
                      </p>
                      <p className="text-xs text-primary/50">Audience</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border border-light p-16 text-center">
            <Megaphone className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">
              No campaigns yet
            </h2>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              Create your first marketing campaign to engage your customers.
            </p>
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Campaign
            </button>
          </div>
        )}
      </div>

      {/* ─── Send Confirmation Modal ───────────────────────── */}
      {sendConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => !sending && setSendConfirmId(null)}
          />
          <div className="relative bg-white rounded-xl border border-light shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-7 h-7 text-teal" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">
                Send Campaign?
              </h3>
              <p className="text-sm text-primary/60 mb-6">
                Are you sure you want to send this campaign? It will be delivered to the
                {' '}
                <strong>
                  {AUDIENCE_LABELS[
                    campaigns.find((c) => c.id === sendConfirmId)?.audience || 'all'
                  ] || 'all customers'}
                </strong>
                {' '}audience. This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setSendConfirmId(null)}
                  disabled={sending}
                  className="btn-outline text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSend(sendConfirmId)}
                  disabled={sending}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create / Edit Modal ───────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-xl border border-light shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-primary">
                {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => handleSubmit(e, false)}
              className="p-6 space-y-5"
            >
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Campaign Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Spring Sale Announcement"
                  className="input-field"
                  required
                />
              </div>

              {/* Type + Audience row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Campaign Type <span className="text-accent">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => updateField('type', e.target.value)}
                    className="input-field"
                  >
                    <option value={CampaignType.EMAIL}>Email</option>
                    <option value={CampaignType.SMS}>SMS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Audience <span className="text-accent">*</span>
                  </label>
                  <select
                    value={form.audience}
                    onChange={(e) => updateField('audience', e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Customers</option>
                    <option value="customers">Past Customers</option>
                    <option value="subscribers">Subscribers</option>
                  </select>
                </div>
              </div>

              {/* Subject (email only) */}
              {form.type === CampaignType.EMAIL && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Email Subject <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                    placeholder="e.g. Don't miss our Spring Sale!"
                    className="input-field"
                    maxLength={200}
                  />
                  <p className="text-xs text-primary/40 mt-1">
                    {form.subject.length}/200 characters
                  </p>
                </div>
              )}

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  {form.type === CampaignType.EMAIL ? 'Email Body' : 'Message Body'}{' '}
                  <span className="text-accent">*</span>
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => updateField('body', e.target.value)}
                  placeholder={
                    form.type === CampaignType.EMAIL
                      ? 'Write your email content here. HTML is supported for rich formatting...'
                      : 'Write your SMS message here (160 characters recommended)...'
                  }
                  className="input-field min-h-[160px] resize-y"
                  required
                />
                {form.type === CampaignType.SMS && (
                  <p className="text-xs text-primary/40 mt-1">
                    {form.body.length} characters
                    {form.body.length > 160 && (
                      <span className="text-yellow-600">
                        {' '}
                        (may be sent as {Math.ceil(form.body.length / 160)} messages)
                      </span>
                    )}
                  </p>
                )}
                {form.type === CampaignType.EMAIL && (
                  <p className="text-xs text-primary/40 mt-1">
                    Rich text editor coming soon. For now, you can use HTML markup.
                  </p>
                )}
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Schedule (optional)
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => updateField('scheduledAt', e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-primary/40 mt-1">
                  Leave blank to save as draft. Set a date to schedule automatic delivery.
                </p>
              </div>

              {/* Form actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-light">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-primary/60 hover:text-primary rounded-lg hover:bg-light transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={saving}
                  className="btn-outline text-sm disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed justify-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : form.scheduledAt ? (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule Campaign
                    </>
                  ) : editingCampaign ? (
                    'Update Campaign'
                  ) : (
                    'Create Campaign'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
