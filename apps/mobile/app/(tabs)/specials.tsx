import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DayOfWeek } from '@ilovefdl/shared';
import type { Special } from '@ilovefdl/shared';
import { api } from '@/lib/api';
import { SpecialCard } from '@/components/SpecialCard';

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

const DAYS: { label: string; short: string; value: DayOfWeek }[] = [
  { label: 'Sunday', short: 'Sun', value: DayOfWeek.SUNDAY },
  { label: 'Monday', short: 'Mon', value: DayOfWeek.MONDAY },
  { label: 'Tuesday', short: 'Tue', value: DayOfWeek.TUESDAY },
  { label: 'Wednesday', short: 'Wed', value: DayOfWeek.WEDNESDAY },
  { label: 'Thursday', short: 'Thu', value: DayOfWeek.THURSDAY },
  { label: 'Friday', short: 'Fri', value: DayOfWeek.FRIDAY },
  { label: 'Saturday', short: 'Sat', value: DayOfWeek.SATURDAY },
];

function getTodayDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay(); // 0 = Sunday
  return DAYS[jsDay].value;
}

/** Group specials by bar name */
function groupByBar(specials: Special[]): Record<string, Special[]> {
  const grouped: Record<string, Special[]> = {};
  for (const special of specials) {
    const barName = special.bar?.name ?? 'Unknown Bar';
    if (!grouped[barName]) {
      grouped[barName] = [];
    }
    grouped[barName].push(special);
  }
  return grouped;
}

export default function SpecialsScreen() {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayOfWeek());
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSpecials = useCallback(async (day: DayOfWeek) => {
    try {
      const res = await api.getSpecials({ day, limit: 100 });
      setSpecials(res.data);
    } catch (error) {
      console.error('Failed to load specials:', error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSpecials(selectedDay).finally(() => setLoading(false));
  }, [selectedDay, fetchSpecials]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSpecials(selectedDay);
    setRefreshing(false);
  }, [selectedDay, fetchSpecials]);

  const grouped = groupByBar(specials);
  const barNames = Object.keys(grouped).sort();
  const today = getTodayDayOfWeek();

  return (
    <View style={styles.container}>
      {/* Day Picker */}
      <View style={styles.dayPickerContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayPicker}
        >
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.value;
            const isToday = today === day.value;
            return (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipActive,
                ]}
                onPress={() => setSelectedDay(day.value)}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    isSelected && styles.dayChipTextActive,
                  ]}
                >
                  {day.short}
                </Text>
                {isToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Specials List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={styles.loadingText}>Loading specials...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.teal}
              colors={[COLORS.teal]}
            />
          }
        >
          {barNames.length > 0 ? (
            barNames.map((barName) => (
              <View key={barName} style={styles.barGroup}>
                <View style={styles.barHeader}>
                  <Ionicons name="beer" size={18} color={COLORS.teal} />
                  <Text style={styles.barName}>{barName}</Text>
                </View>
                {grouped[barName].map((special) => (
                  <SpecialCard key={special.id} special={special} showBarName={false} />
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No specials found</Text>
              <Text style={styles.emptySubtitle}>
                No specials are listed for{' '}
                {DAYS.find((d) => d.value === selectedDay)?.label}
              </Text>
            </View>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  dayPickerContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  dayPicker: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    minWidth: 52,
  },
  dayChipActive: {
    backgroundColor: COLORS.teal,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  dayChipTextActive: {
    color: COLORS.white,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.accent,
    marginTop: 3,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  barGroup: {
    marginBottom: 20,
  },
  barHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  barName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
});
