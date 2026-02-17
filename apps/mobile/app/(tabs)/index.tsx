import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Product, BlogPost, Special } from '@ilovefdl/shared';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { PostCard } from '@/components/PostCard';
import { SpecialCard } from '@/components/SpecialCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([]);
  const [todaySpecials, setTodaySpecials] = useState<Special[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [productsRes, postsRes, specialsRes] = await Promise.all([
        api.getProducts({ limit: 10 }),
        api.getPosts({ limit: 5, status: 'PUBLISHED' }),
        api.getTodaySpecials(),
      ]);
      setFeaturedProducts(productsRes.data);
      setLatestPosts(postsRes.data);
      setTodaySpecials(specialsRes.data);
    } catch (error) {
      console.error('Failed to load home data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.teal}
          colors={[COLORS.teal]}
        />
      }
    >
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerSubtitle}>Welcome to</Text>
        <Text style={styles.bannerTitle}>I Love FDL</Text>
        <Text style={styles.bannerDescription}>
          Your community platform for Fond du Lac, WI
        </Text>
      </View>

      {/* Quick Links */}
      <View style={styles.quickLinks}>
        <TouchableOpacity
          style={styles.quickLink}
          onPress={() => router.push('/(tabs)/marketplace')}
        >
          <View style={[styles.quickLinkIcon, { backgroundColor: COLORS.teal }]}>
            <Ionicons name="storefront" size={22} color={COLORS.white} />
          </View>
          <Text style={styles.quickLinkText}>Shop Local</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickLink}
          onPress={() => router.push('/(tabs)/specials')}
        >
          <View style={[styles.quickLinkIcon, { backgroundColor: COLORS.accent }]}>
            <Ionicons name="pricetag" size={22} color={COLORS.white} />
          </View>
          <Text style={styles.quickLinkText}>Specials</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickLink}
          onPress={() => router.push('/(tabs)/news')}
        >
          <View style={[styles.quickLinkIcon, { backgroundColor: COLORS.primaryDark }]}>
            <Ionicons name="newspaper" size={22} color={COLORS.white} />
          </View>
          <Text style={styles.quickLinkText}>News</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickLink}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <View style={[styles.quickLinkIcon, { backgroundColor: COLORS.teal }]}>
            <Ionicons name="person" size={22} color={COLORS.white} />
          </View>
          <Text style={styles.quickLinkText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Featured Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={featuredProducts}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.horizontalCard}>
              <ProductCard product={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyHorizontal}>
              <Ionicons name="basket-outline" size={32} color="#ccc" />
              <Text style={styles.emptyText}>No products yet</Text>
            </View>
          }
        />
      </View>

      {/* Today's Specials Preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Specials</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/specials')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {todaySpecials.length > 0 ? (
          todaySpecials.slice(0, 3).map((special) => (
            <SpecialCard key={special.id} special={special} />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="pricetag-outline" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No specials today</Text>
          </View>
        )}
      </View>

      {/* Latest News */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest News</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/news')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {latestPosts.length > 0 ? (
          latestPosts.slice(0, 3).map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="newspaper-outline" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No news yet</Text>
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
  banner: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerSubtitle: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bannerTitle: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  bannerDescription: {
    color: '#a0a0a0',
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  quickLink: {
    alignItems: 'center',
    gap: 6,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.teal,
  },
  horizontalList: {
    paddingRight: 16,
  },
  horizontalCard: {
    width: SCREEN_WIDTH * 0.42,
    marginRight: 12,
  },
  emptyHorizontal: {
    width: SCREEN_WIDTH - 64,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
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
    height: 24,
  },
});
