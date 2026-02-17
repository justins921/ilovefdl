import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { PostCategory } from '@ilovefdl/shared';
import type { BlogPost } from '@ilovefdl/shared';
import { api } from '@/lib/api';
import { PostCard } from '@/components/PostCard';

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

const CATEGORY_LABELS: Record<string, string> = {
  ALL: 'All',
  [PostCategory.THE_FONDY_FRONTLINE]: 'Fondy Frontline',
  [PostCategory.FACES_OF_OUR_FUTURE]: 'Faces of Our Future',
  [PostCategory.FINDING_BALANCE]: 'Finding Balance',
  [PostCategory.PLAY_EXPLORE_REPEAT]: 'Play Explore Repeat',
  [PostCategory.HOMEGROWN_HEROS]: 'Homegrown Heroes',
  [PostCategory.THE_CREATIVE_CORNER]: 'Creative Corner',
  [PostCategory.WEEKLY_SAVINGS]: 'Weekly Savings',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function NewsScreen() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(
    async (pageNum: number, category: string, append = false) => {
      try {
        const params: Record<string, string | number | undefined> = {
          page: pageNum,
          limit: 15,
          status: 'PUBLISHED',
        };
        if (category !== 'ALL') {
          params.category = category;
        }
        const res = await api.getPosts(params);
        if (append) {
          setPosts((prev) => [...prev, ...res.data]);
        } else {
          setPosts(res.data);
        }
        setTotalPages(res.totalPages);
      } catch (error) {
        console.error('Failed to load posts:', error);
      }
    },
    [],
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchPosts(1, selectedCategory).finally(() => setLoading(false));
  }, [selectedCategory, fetchPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchPosts(1, selectedCategory);
    setRefreshing(false);
  }, [selectedCategory, fetchPosts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPosts(nextPage, selectedCategory, true);
    setPage(nextPage);
    setLoadingMore(false);
  }, [loadingMore, page, totalPages, selectedCategory, fetchPosts]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.teal} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[styles.chipText, isActive && styles.chipTextActive]}
                >
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Posts List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <PostCard post={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.teal}
              colors={[COLORS.teal]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No articles found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedCategory !== 'ALL'
                  ? 'Try selecting a different category'
                  : 'Check back soon for new articles'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
  },
  chipActive: {
    backgroundColor: COLORS.teal,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  list: {
    padding: 16,
    paddingBottom: 24,
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
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
