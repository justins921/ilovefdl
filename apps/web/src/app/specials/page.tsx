'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Tag, Beer, Star, Filter } from 'lucide-react';
import SpecialCard from '@/components/SpecialCard';
import api from '@/lib/api';
import { DayOfWeek } from '@ilovefdl/shared';
import type { Special, PaginatedResponse } from '@ilovefdl/shared';

const daysOfWeek = [
  { label: 'Monday', short: 'Mon', value: DayOfWeek.MONDAY },
  { label: 'Tuesday', short: 'Tue', value: DayOfWeek.TUESDAY },
  { label: 'Wednesday', short: 'Wed', value: DayOfWeek.WEDNESDAY },
  { label: 'Thursday', short: 'Thu', value: DayOfWeek.THURSDAY },
  { label: 'Friday', short: 'Fri', value: DayOfWeek.FRIDAY },
  { label: 'Saturday', short: 'Sat', value: DayOfWeek.SATURDAY },
  { label: 'Sunday', short: 'Sun', value: DayOfWeek.SUNDAY },
];

function getTodayDayOfWeek(): DayOfWeek {
  const days = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];
  return days[new Date().getDay()];
}

export default function SpecialsPage() {
  const todayDay = getTodayDayOfWeek();
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDay);

  const fetchSpecials = useCallback(async () => {
    setLoading(true);
    try {
      const res: PaginatedResponse<Special> = await api.getSpecials({
        day: activeDay,
        limit: 50,
      });
      setSpecials(res.data);
    } catch {
      setSpecials([]);
    } finally {
      setLoading(false);
    }
  }, [activeDay]);

  useEffect(() => {
    fetchSpecials();
  }, [fetchSpecials]);

  // Group specials by bar
  const specialsByBar = specials.reduce<Record<string, { barName: string; barSlug: string; specials: Special[] }>>(
    (acc, special) => {
      const barId = special.barId;
      const barName = special.bar?.name || 'Unknown Bar';
      const barSlug = special.bar?.slug || barId;
      if (!acc[barId]) {
        acc[barId] = { barName, barSlug, specials: [] };
      }
      acc[barId].specials.push(special);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-light">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-accent to-accent/80 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <Tag className="w-6 h-6" />
            <span className="text-white/80 text-sm font-medium uppercase tracking-wide">
              Updated Daily
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {activeDay === todayDay
              ? "Today\u0027s Specials"
              : `${daysOfWeek.find((d) => d.value === activeDay)?.label || ''} Specials`}
          </h1>
          <p className="text-white/80 text-lg">
            {activeDay === todayDay
              ? 'The best food and drink deals in Fond du Lac, happening right now'
              : `Specials for ${daysOfWeek.find((d) => d.value === activeDay)?.label || ''} in Fond du Lac`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Day Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {daysOfWeek.map((day) => (
            <button
              key={day.value}
              onClick={() => setActiveDay(day.value)}
              className={`px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeDay === day.value
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'bg-white text-primary/70 hover:bg-accent/10 border border-light'
              } ${day.value === todayDay && activeDay !== day.value ? 'ring-2 ring-accent/30' : ''}`}
            >
              <span className="hidden sm:inline">{day.label}</span>
              <span className="sm:hidden">{day.short}</span>
              {day.value === todayDay && (
                <span className="ml-2 text-xs opacity-70">(Today)</span>
              )}
            </button>
          ))}
        </div>

        {/* Specials */}
        {loading ? (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-white rounded w-1/4 mb-4" />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="h-32 bg-white rounded-xl" />
                  <div className="h-32 bg-white rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(specialsByBar).length > 0 ? (
          <div className="space-y-10">
            {Object.entries(specialsByBar).map(([barId, group]) => (
              <div key={barId}>
                <div className="flex items-center justify-between mb-4">
                  <Link
                    href={`/bars/${group.barSlug}`}
                    className="flex items-center gap-2 group"
                  >
                    <Beer className="w-5 h-5 text-teal" />
                    <h2 className="text-xl font-bold text-primary group-hover:text-teal transition-colors">
                      {group.barName}
                    </h2>
                  </Link>
                  <Link
                    href={`/bars/${group.barSlug}`}
                    className="text-sm text-teal hover:underline"
                  >
                    View Bar
                  </Link>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {group.specials.map((special) => (
                    <SpecialCard key={special.id} special={special} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Star className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">
              No Specials for{' '}
              {daysOfWeek.find((d) => d.value === activeDay)?.label || 'Today'}
            </h3>
            <p className="text-primary/60 mb-6">
              Check out other days of the week, or browse all bars.
            </p>
            <Link href="/bars" className="btn-secondary">
              Browse Bars
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
