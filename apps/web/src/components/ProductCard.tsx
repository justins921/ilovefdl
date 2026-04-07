import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@ilovefdl/shared';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images?.[0];

  return (
    <Link href={`/marketplace/${product.slug}`} className="card group">
      {/* Image */}
      <div className="aspect-square bg-light relative overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-light to-teal/10">
            <ShoppingBag className="w-12 h-12 text-primary/20" />
          </div>
        )}
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <span className="absolute top-3 left-3 badge bg-accent text-white text-xs">
            Sale
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {product.vendor && (
          <p className="text-xs text-teal font-medium mb-1 truncate">
            {product.vendor.businessName}
          </p>
        )}
        <h3 className="font-semibold text-primary line-clamp-2 mb-2 group-hover:text-accent transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary text-lg">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-sm text-primary/40 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
        {product.inventory <= 0 && (
          <span className="text-xs text-accent mt-1 inline-block">
            Out of stock
          </span>
        )}
      </div>
    </Link>
  );
}
