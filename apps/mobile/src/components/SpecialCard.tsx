import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Special } from '@ilovefdl/shared';

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

interface SpecialCardProps {
  special: Special;
  /** Whether to show the bar name. Defaults to true. */
  showBarName?: boolean;
}

export function SpecialCard({ special, showBarName = true }: SpecialCardProps) {
  const router = useRouter();

  const handleBarPress = () => {
    if (special.bar) {
      router.push(`/bar/${special.bar.slug}`);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return null;
    // Handle "HH:MM" format
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const timeRange =
    special.startTime || special.endTime
      ? [formatTime(special.startTime), formatTime(special.endTime)]
          .filter(Boolean)
          .join(' - ')
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.leftAccent} />
      <View style={styles.content}>
        {/* Bar Name */}
        {showBarName && special.bar && (
          <TouchableOpacity onPress={handleBarPress}>
            <Text style={styles.barName}>{special.bar.name}</Text>
          </TouchableOpacity>
        )}

        {/* Title */}
        <Text style={styles.title}>{special.title}</Text>

        {/* Description */}
        {special.description && (
          <Text style={styles.description} numberOfLines={2}>
            {special.description}
          </Text>
        )}

        {/* Bottom Row: Time & Price */}
        <View style={styles.bottomRow}>
          {timeRange && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color="#999" />
              <Text style={styles.metaText}>{timeRange}</Text>
            </View>
          )}
          {special.price && (
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{special.price}</Text>
            </View>
          )}
        </View>

        {/* Featured Badge */}
        {special.isFeatured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={10} color={COLORS.accent} />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  leftAccent: {
    width: 4,
    backgroundColor: COLORS.teal,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  barName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    lineHeight: 21,
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  priceBadge: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
});
