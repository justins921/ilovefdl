import { PostCategory } from '@ilovefdl/shared';

/**
 * Format a date string into a human-readable format.
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a price value (in dollars) to a currency string.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Convert a PostCategory enum value to a human-readable display name.
 */
export function formatCategoryName(category: PostCategory): string {
  const categoryMap: Record<PostCategory, string> = {
    [PostCategory.THE_FONDY_FRONTLINE]: 'The Fondy Frontline',
    [PostCategory.FACES_OF_OUR_FUTURE]: 'Faces of our Future',
    [PostCategory.FINDING_BALANCE]: 'Finding Balance',
    [PostCategory.PLAY_EXPLORE_REPEAT]: 'Play. Explore. Repeat.',
    [PostCategory.HOMEGROWN_HEROS]: 'Homegrown Heros',
    [PostCategory.THE_CREATIVE_CORNER]: 'The Creative Corner',
    [PostCategory.WEEKLY_SAVINGS]: 'Weekly Savings',
    [PostCategory.UNCATEGORIZED]: 'Uncategorized',
  };
  return categoryMap[category] || category;
}

/**
 * Convert text to a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Merge class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
