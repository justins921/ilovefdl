import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DayOfWeek } from '@ilovefdl/shared';
import type { Bar, Special } from '@ilovefdl/shared';
import { api } from '@/lib/api';
import { SpecialCard } from '@/components/SpecialCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

const DAY_ORDER: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

export default function BarDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [bar, setBar] = useState<Bar | null>(null);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      api.getBar(slug),
      api.getSpecials({ barId: slug, limit: 100 }),
    ])
      .then(([barRes, specialsRes]) => {
        setBar(barRes.data);
        setSpecials(specialsRes.data);
      })
      .catch((err) => console.error('Failed to load bar:', err))
      .finally(() => setLoading(false));
  }, [slug]);

  /** Group specials by day */
  const specialsByDay: Record<string, Special[]> = {};
  for (const s of specials) {
    if (!specialsByDay[s.dayOfWeek]) specialsByDay[s.dayOfWeek] = [];
    specialsByDay[s.dayOfWeek].push(s);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  if (!bar) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Bar not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Photo */}
      {bar.photos.length > 0 ? (
        <Image
          source={{ uri: bar.photos[0] }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.heroPlaceholder}>
          <Ionicons name="beer-outline" size={64} color="#ccc" />
        </View>
      )}

      {/* Bar Info */}
      <View style={styles.infoSection}>
        <Text style={styles.barName}>{bar.name}</Text>
        {bar.description && (
          <Text style={styles.description}>{bar.description}</Text>
        )}

        {/* Contact Details */}
        <View style={styles.details}>
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => bar.mapLink && Linking.openURL(bar.mapLink)}
            disabled={!bar.mapLink}
          >
            <Ionicons name="location" size={18} color={COLORS.teal} />
            <Text style={styles.detailText}>{bar.address}</Text>
          </TouchableOpacity>
          {bar.phone && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => Linking.openURL(`tel:${bar.phone}`)}
            >
              <Ionicons name="call" size={18} color={COLORS.teal} />
              <Text style={styles.detailText}>{bar.phone}</Text>
            </TouchableOpacity>
          )}
          {bar.website && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => Linking.openURL(bar.website!)}
            >
              <Ionicons name="globe" size={18} color={COLORS.teal} />
              <Text style={styles.detailText}>{bar.website}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Hours */}
        {bar.hours && (
          <View style={styles.hoursSection}>
            <Text style={styles.sectionTitle}>Hours</Text>
            <View style={styles.hoursCard}>
              {DAY_ORDER.map((day) => {
                const hours = bar.hours?.[day];
                return (
                  <View key={day} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{DAY_LABELS[day]}</Text>
                    <Text style={styles.hoursTime}>
                      {hours ? `${hours.open} - ${hours.close}` : 'Closed'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Weekly Specials */}
      <View style={styles.specialsSection}>
        <Text style={styles.sectionTitle}>Weekly Specials</Text>
        {DAY_ORDER.map((day) => {
          const daySpecials = specialsByDay[day];
          if (!daySpecials || daySpecials.length === 0) return null;
          return (
            <View key={day} style={styles.dayGroup}>
              <Text style={styles.dayLabel}>{DAY_LABELS[day]}</Text>
              {daySpecials.map((special) => (
                <SpecialCard
                  key={special.id}
                  special={special}
                  showBarName={false}
                />
              ))}
            </View>
          );
        })}
        {specials.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="pricetag-outline" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No specials listed</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.56,
  },
  heroPlaceholder: {
    width: SCREEN_WIDTH,
    height: 200,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  barName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginTop: 8,
  },
  details: {
    marginTop: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.primaryDark,
    flex: 1,
  },
  hoursSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 12,
  },
  hoursCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hoursDay: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  hoursTime: {
    fontSize: 14,
    color: '#666',
  },
  specialsSection: {
    padding: 16,
  },
  dayGroup: {
    marginBottom: 16,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.teal,
    marginBottom: 8,
  },
  emptyCard: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});
