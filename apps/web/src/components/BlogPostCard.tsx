import Link from 'next/link';
import Image from 'next/image';
import { Newspaper, Calendar, User } from 'lucide-react';
import { formatDate, formatCategoryName } from '@/lib/utils';
import type { BlogPost } from '@ilovefdl/shared';

interface BlogPostCardProps {
  post: BlogPost;
}

export default function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <Link href={`/news/${post.slug}`} className="card group">
      {/* Featured Image */}
      <div className="aspect-[16/9] bg-light relative overflow-hidden">
        {post.featuredImage ? (
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal/10 to-accent/10">
            <Newspaper className="w-12 h-12 text-teal/30" />
          </div>
        )}
        <span className="absolute top-3 left-3 badge-teal">
          {formatCategoryName(post.category)}
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="font-bold text-primary text-lg mb-2 line-clamp-2 group-hover:text-accent transition-colors">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-primary/60 text-sm line-clamp-3 mb-4">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-primary/50">
          {post.author && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{post.author.name || 'Staff'}</span>
            </div>
          )}
          {post.publishedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(post.publishedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
