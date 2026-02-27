'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Beer,
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  Clock,
  ChevronLeft,
  ChevronRight,
  Star,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Camera,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import SpecialCard from '@/components/SpecialCard';
import ImageUpload from '@/components/ImageUpload';
import { DayOfWeek } from '@ilovefdl/shared';
import type { Bar, Special } from '@ilovefdl/shared';

const daysOfWeek = [
  { label: 'Monday', value: DayOfWeek.MONDAY },
  { label: 'Tuesday', value: DayOfWeek.TUESDAY },
  { label: 'Wednesday', value: DayOfWeek.WEDNESDAY },
  { label: 'Thursday', value: DayOfWeek.THURSDAY },
  { label: 'Friday', value: DayOfWeek.FRIDAY },
  { label: 'Saturday', value: DayOfWeek.SATURDAY },
  { label: 'Sunday', value: DayOfWeek.SUNDAY },
];

export default function BarDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { user } = useAuth();
  const [bar, setBar] = useState<Bar | null>(null);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [activeDay, setActiveDay] = useState<string>(() => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date().getDay()];
  });

  // Special management state
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<Special | null>(null);
  const [savingSpecial, setSavingSpecial] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [specialError, setSpecialError] = useState('');

  // Special form state
  const [specialDay, setSpecialDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [specialTitle, setSpecialTitle] = useState('');
  const [specialDescription, setSpecialDescription] = useState('');
  const [specialPrice, setSpecialPrice] = useState('');
  const [specialStartTime, setSpecialStartTime] = useState('');
  const [specialEndTime, setSpecialEndTime] = useState('');
  const [specialIsFeatured, setSpecialIsFeatured] = useState(false);

  // Photo management state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [barPhotos, setBarPhotos] = useState<string[]>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);

  const canManage = user?.role === 'ADMIN' || (bar?.ownerId != null && bar.ownerId === user?.id);

  const fetchSpecials = useCallback(async (barId: string) => {
    try {
      const specialsRes = await api.getSpecials({ barId, limit: 50 });
      setSpecials(specialsRes.data);
    } catch {
      setSpecials([]);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const barRes = await api.getBar(params.slug);
        setBar(barRes.data);
        await fetchSpecials(barRes.data.id);
      } catch {
        setBar(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.slug, fetchSpecials]);

  function resetSpecialForm() {
    setSpecialDay(activeDay as DayOfWeek);
    setSpecialTitle('');
    setSpecialDescription('');
    setSpecialPrice('');
    setSpecialStartTime('');
    setSpecialEndTime('');
    setSpecialIsFeatured(false);
    setSpecialError('');
  }

  function openCreateSpecial() {
    setEditingSpecial(null);
    resetSpecialForm();
    setShowSpecialModal(true);
  }

  function openEditSpecial(special: Special) {
    setEditingSpecial(special);
    setSpecialDay(special.dayOfWeek);
    setSpecialTitle(special.title);
    setSpecialDescription(special.description ?? '');
    setSpecialPrice(special.price ?? '');
    setSpecialStartTime(special.startTime ?? '');
    setSpecialEndTime(special.endTime ?? '');
    setSpecialIsFeatured(special.isFeatured);
    setSpecialError('');
    setShowSpecialModal(true);
  }

  async function handleSaveSpecial(e: React.FormEvent) {
    e.preventDefault();
    if (!bar) return;
    setSavingSpecial(true);
    setSpecialError('');

    try {
      const data = {
        barId: bar.id,
        dayOfWeek: specialDay,
        title: specialTitle,
        description: specialDescription || undefined,
        price: specialPrice || undefined,
        startTime: specialStartTime || undefined,
        endTime: specialEndTime || undefined,
        isFeatured: specialIsFeatured,
        isActive: true,
      };

      if (editingSpecial) {
        const { barId: _, ...updateData } = data;
        await api.updateSpecial(editingSpecial.id, updateData);
      } else {
        await api.createSpecial(data);
      }

      setShowSpecialModal(false);
      resetSpecialForm();
      await fetchSpecials(bar.id);
    } catch (err: any) {
      setSpecialError(err?.message || 'Failed to save special.');
    } finally {
      setSavingSpecial(false);
    }
  }

  async function handleDeleteSpecial(specialId: string) {
    if (!bar || !confirm('Delete this special?')) return;
    setDeletingId(specialId);
    try {
      await api.deleteSpecial(specialId);
      await fetchSpecials(bar.id);
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }

  function openPhotoModal() {
    setBarPhotos(bar?.photos ?? []);
    setShowPhotoModal(true);
  }

  async function handleSavePhotos() {
    if (!bar) return;
    setSavingPhotos(true);
    try {
      await api.updateBar(bar.id, { photos: barPhotos });
      setBar({ ...bar, photos: barPhotos });
      setShowPhotoModal(false);
    } catch {
      // silently fail
    } finally {
      setSavingPhotos(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="animate-pulse">
          <div className="h-64 bg-white" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-4 bg-white rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">
            Bar Not Found
          </h1>
          <p className="text-primary/60 mb-6">
            This listing doesn&apos;t exist or may have been removed.
          </p>
          <Link href="/bars" className="btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bars
          </Link>
        </div>
      </div>
    );
  }

  const photos = bar.photos && bar.photos.length > 0 ? bar.photos : [];
  const filteredSpecials = specials.filter((s) => s.dayOfWeek === activeDay);

  return (
    <div className="min-h-screen bg-light">
      {/* Photo Gallery */}
      <div className="relative h-64 md:h-80 bg-primary overflow-hidden">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[activePhoto]}
              alt={bar.name}
              className="w-full h-full object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActivePhoto(
                      activePhoto === 0 ? photos.length - 1 : activePhoto - 1
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setActivePhoto(
                      activePhoto === photos.length - 1 ? 0 : activePhoto + 1
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhoto(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        activePhoto === i ? 'bg-white' : 'bg-white/50'
                      }`}
                      aria-label={`View photo ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-teal/30">
            <Beer className="w-24 h-24 text-white/20" />
          </div>
        )}
        {canManage && (
          <button
            onClick={openPhotoModal}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-lg shadow text-sm font-medium text-primary hover:bg-white transition-colors"
          >
            <Camera className="w-4 h-4" />
            Manage Photos
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-primary/60 mb-6">
          <Link href="/bars" className="hover:text-teal transition-colors">
            Bars & Restaurants
          </Link>
          <span>/</span>
          <span className="text-primary">{bar.name}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              {bar.name}
            </h1>
            {bar.description && (
              <p className="text-primary/60 text-lg leading-relaxed mb-8">
                {bar.description}
              </p>
            )}

            {/* Weekly Specials */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-primary">
                  Weekly Specials
                </h2>
                {canManage && (
                  <button
                    onClick={openCreateSpecial}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Special
                  </button>
                )}
              </div>

              {/* Day Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                {daysOfWeek.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => setActiveDay(day.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeDay === day.value
                        ? 'bg-accent text-white'
                        : 'bg-white text-primary/70 hover:bg-accent/10 border border-light'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              {/* Specials for Selected Day */}
              {filteredSpecials.length > 0 ? (
                <div className="grid gap-4">
                  {filteredSpecials.map((special) => (
                    <div key={special.id} className="relative group">
                      <SpecialCard special={special} />
                      {canManage && (
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditSpecial(special)}
                            className="w-8 h-8 bg-white rounded-lg shadow border border-light flex items-center justify-center text-primary/50 hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSpecial(special.id)}
                            disabled={deletingId === special.id}
                            className="w-8 h-8 bg-white rounded-lg shadow border border-light flex items-center justify-center text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === special.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-light">
                  <Star className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                  <p className="text-primary/60 mb-3">
                    No specials listed for{' '}
                    {daysOfWeek.find((d) => d.value === activeDay)?.label || 'this day'}.
                  </p>
                  {canManage && (
                    <button
                      onClick={openCreateSpecial}
                      className="text-sm text-teal hover:underline font-medium"
                    >
                      Add a special for this day
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Bar Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-light p-6 sticky top-24">
              <h3 className="font-bold text-primary text-lg mb-4">
                Information
              </h3>

              <div className="space-y-4">
                {bar.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">Address</p>
                      <p className="text-sm text-primary/60">{bar.address}</p>
                      {bar.mapLink && (
                        <a
                          href={bar.mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-teal hover:underline inline-flex items-center gap-1 mt-1"
                        >
                          View on Map
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {bar.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">Phone</p>
                      <a
                        href={`tel:${bar.phone}`}
                        className="text-sm text-teal hover:underline"
                      >
                        {bar.phone}
                      </a>
                    </div>
                  </div>
                )}

                {bar.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">Website</p>
                      <a
                        href={bar.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-teal hover:underline inline-flex items-center gap-1"
                      >
                        Visit Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {bar.hours && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary mb-2">
                        Hours
                      </p>
                      <div className="space-y-1">
                        {daysOfWeek.map((day) => {
                          const hours =
                            bar.hours?.[day.value.toLowerCase()] || null;
                          return (
                            <div
                              key={day.value}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-primary/60 w-20">
                                {day.label.slice(0, 3)}
                              </span>
                              <span className="text-primary/80">
                                {hours
                                  ? `${hours.open} - ${hours.close}`
                                  : 'Closed'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Special Modal */}
      {showSpecialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-primary">
                {editingSpecial ? 'Edit Special' : 'Add Special'}
              </h3>
              <button
                onClick={() => setShowSpecialModal(false)}
                className="text-primary/40 hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpecial} className="space-y-4">
              {/* Day of Week */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Day of Week
                </label>
                <select
                  value={specialDay}
                  onChange={(e) => setSpecialDay(e.target.value as DayOfWeek)}
                  className="input-field w-full"
                >
                  {daysOfWeek.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={specialTitle}
                  onChange={(e) => setSpecialTitle(e.target.value)}
                  className="input-field w-full"
                  placeholder="e.g. Half-Price Wings"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Description <span className="text-primary/40">(optional)</span>
                </label>
                <textarea
                  value={specialDescription}
                  onChange={(e) => setSpecialDescription(e.target.value)}
                  className="input-field w-full h-20 resize-y"
                  placeholder="Describe the special..."
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Price <span className="text-primary/40">(optional)</span>
                </label>
                <input
                  type="text"
                  value={specialPrice}
                  onChange={(e) => setSpecialPrice(e.target.value)}
                  className="input-field w-full"
                  placeholder="$5.00"
                />
              </div>

              {/* Time row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={specialStartTime}
                    onChange={(e) => setSpecialStartTime(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={specialEndTime}
                    onChange={(e) => setSpecialEndTime(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Is Featured */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="specialFeatured"
                  checked={specialIsFeatured}
                  onChange={(e) => setSpecialIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-light text-primary focus:ring-primary"
                />
                <label htmlFor="specialFeatured" className="text-sm font-medium text-primary">
                  Featured special
                </label>
              </div>

              {specialError && (
                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-accent text-sm">
                  {specialError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-light">
                <button
                  type="button"
                  onClick={() => setShowSpecialModal(false)}
                  className="btn-outline"
                  disabled={savingSpecial}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={savingSpecial || !specialTitle}
                >
                  {savingSpecial && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSpecial ? 'Update Special' : 'Add Special'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Management Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-primary">Manage Photos</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-primary/40 hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ImageUpload
              images={barPhotos}
              onChange={setBarPhotos}
              max={20}
            />

            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-light">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="btn-outline"
                disabled={savingPhotos}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePhotos}
                className="btn-primary flex items-center gap-2"
                disabled={savingPhotos}
              >
                {savingPhotos && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Photos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
