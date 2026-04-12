import Link from 'next/link';
import { MapPin, Beer, Clock } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import type { Bar } from '@ilovefdl/shared';

interface BarCardProps {
  bar: Bar;
}

export default function BarCard({ bar }: BarCardProps) {
  const imageUrl = bar.photos?.[0];
  const specialsCount = bar.specials?.length ?? 0;

  return (
    <Link href={`/bars/${bar.slug}`} className="card group">
      {/* Photo */}
      <div className="aspect-[16/10] bg-light relative overflow-hidden">
        {imageUrl ? (
          <img
            src={resolveImageUrl(imageUrl)}
            alt={bar.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-teal/10">
            <Beer className="w-12 h-12 text-primary/20" />
          </div>
        )}
        {specialsCount > 0 && (
          <span className="absolute top-3 right-3 badge bg-accent text-white text-xs">
            {specialsCount} special{specialsCount !== 1 ? 's' : ''} today
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="font-bold text-primary text-lg mb-2 group-hover:text-accent transition-colors">
          {bar.name}
        </h3>
        {bar.description && (
          <p className="text-primary/60 text-sm line-clamp-2 mb-3">
            {bar.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-primary/50">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{bar.address}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
