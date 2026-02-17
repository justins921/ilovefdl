'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import api from '@/lib/api';
import SpecialCard from '@/components/SpecialCard';
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
  const [bar, setBar] = useState<Bar | null>(null);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [activeDay, setActiveDay] = useState<string>(() => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date().getDay()];
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const barRes = await api.getBar(params.slug);
        setBar(barRes.data);

        const specialsRes = await api.getSpecials({
          barId: barRes.data.id,
          limit: 50,
        });
        setSpecials(specialsRes.data);
      } catch {
        setBar(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.slug]);

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
              <h2 className="text-2xl font-bold text-primary mb-6">
                Weekly Specials
              </h2>

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
                    <SpecialCard key={special.id} special={special} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-light">
                  <Star className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                  <p className="text-primary/60">
                    No specials listed for{' '}
                    {daysOfWeek.find((d) => d.value === activeDay)?.label || 'this day'}.
                  </p>
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
    </div>
  );
}
