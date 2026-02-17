import Link from 'next/link';
import { Store, ShoppingBag } from 'lucide-react';
import type { Vendor } from '@ilovefdl/shared';

interface VendorCardProps {
  vendor: Vendor;
}

export default function VendorCard({ vendor }: VendorCardProps) {
  const productCount = vendor.products?.length ?? 0;

  return (
    <Link href={`/vendors/${vendor.slug}`} className="card group">
      {/* Banner / Logo */}
      <div className="aspect-[2/1] bg-light relative overflow-hidden">
        {vendor.bannerUrl ? (
          <img
            src={vendor.bannerUrl}
            alt={vendor.businessName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal/10 to-accent/5">
            <Store className="w-16 h-16 text-teal/20" />
          </div>
        )}
        {vendor.logoUrl && (
          <div className="absolute bottom-0 left-4 translate-y-1/2">
            <div className="w-16 h-16 rounded-xl border-4 border-white bg-white overflow-hidden shadow-sm">
              <img
                src={vendor.logoUrl}
                alt={`${vendor.businessName} logo`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`p-5 ${vendor.logoUrl ? 'pt-10' : ''}`}>
        <h3 className="font-bold text-primary text-lg group-hover:text-accent transition-colors">
          {vendor.businessName}
        </h3>
        {vendor.description && (
          <p className="text-primary/60 text-sm line-clamp-2 mt-2 mb-3">
            {vendor.description}
          </p>
        )}
        <div className="flex items-center gap-1 text-xs text-primary/50">
          <ShoppingBag className="w-3 h-3" />
          <span>
            {productCount} product{productCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
