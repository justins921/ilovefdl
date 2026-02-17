import Link from 'next/link';
import { Clock, Beer } from 'lucide-react';
import type { Special } from '@ilovefdl/shared';

interface SpecialCardProps {
  special: Special;
}

export default function SpecialCard({ special }: SpecialCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-3">
        {special.bar ? (
          <Link
            href={`/bars/${special.bar.slug}`}
            className="badge-accent hover:bg-accent/20 transition-colors"
          >
            {special.bar.name}
          </Link>
        ) : (
          <span className="badge-accent">
            <Beer className="w-3 h-3 mr-1" />
            Special
          </span>
        )}
        {special.price && (
          <span className="text-accent font-bold text-lg">{special.price}</span>
        )}
      </div>
      <h3 className="font-bold text-primary text-lg mb-1">{special.title}</h3>
      {special.description && (
        <p className="text-primary/60 text-sm mb-3">{special.description}</p>
      )}
      {(special.startTime || special.endTime) && (
        <div className="flex items-center gap-1 text-xs text-primary/50">
          <Clock className="w-3 h-3" />
          <span>
            {special.startTime && special.endTime
              ? `${special.startTime} - ${special.endTime}`
              : special.startTime || special.endTime}
          </span>
        </div>
      )}
    </div>
  );
}
