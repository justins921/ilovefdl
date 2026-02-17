import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { BlogPost } from '@ilovefdl/shared';
import { api } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

const CATEGORY_LABELS: Record<string, string> = {
  THE_FONDY_FRONTLINE: 'Fondy Frontline',
  FACES_OF_OUR_FUTURE: 'Faces of Our Future',
  FINDING_BALANCE: 'Finding Balance',
  PLAY_EXPLORE_REPEAT: 'Play Explore Repeat',
  HOMEGROWN_HEROS: 'Homegrown Heroes',
  THE_CREATIVE_CORNER: 'Creative Corner',
  WEEKLY_SAVINGS: 'Weekly Savings',
  UNCATEGORIZED: 'Uncategorized',
};

export default function PostDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .getPost(slug)
      .then((res) => setPost(res.data))
      .catch((err) => console.error('Failed to load post:', err))
      .finally(() => setLoading(false));
  }, [slug]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Article not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Featured Image */}
      {post.featuredImage ? (
        <Image
          source={{ uri: post.featuredImage }}
          style={styles.featuredImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="newspaper-outline" size={48} color="#ccc" />
        </View>
      )}

      <View style={styles.content}>
        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {CATEGORY_LABELS[post.category] ?? post.category}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{post.title}</Text>

        {/* Meta */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#999" />
            <Text style={styles.metaText}>
              {post.publishedAt
                ? formatDate(post.publishedAt)
                : formatDate(post.createdAt)}
            </Text>
          </View>
          {post.author && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={14} color="#999" />
              <Text style={styles.metaText}>
                {post.author.name ?? post.author.email}
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {post.tags.length > 0 && (
          <View style={styles.tags}>
            {post.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Body Content */}
        <Text style={styles.body}>{post.content}</Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
  featuredImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.56,
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: 180,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.teal,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primaryDark,
    lineHeight: 34,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#999',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  body: {
    fontSize: 16,
    color: '#333',
    lineHeight: 26,
  },
  bottomSpacer: {
    height: 40,
  },
});
