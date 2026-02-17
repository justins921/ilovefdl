import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { BlogPost } from '@ilovefdl/shared';

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

interface PostCardProps {
  post: BlogPost;
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePress = () => {
    router.push(`/post/${post.slug}`);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Featured Image */}
      {post.featuredImage ? (
        <Image
          source={{ uri: post.featuredImage }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="newspaper-outline" size={24} color="#ccc" />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Category */}
        <Text style={styles.category}>
          {CATEGORY_LABELS[post.category] ?? post.category}
        </Text>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>

        {/* Excerpt */}
        {post.excerpt && (
          <Text style={styles.excerpt} numberOfLines={2}>
            {post.excerpt}
          </Text>
        )}

        {/* Date */}
        <Text style={styles.date}>
          {post.publishedAt
            ? formatDate(post.publishedAt)
            : formatDate(post.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: 110,
    height: '100%',
    minHeight: 110,
    backgroundColor: COLORS.lightGray,
  },
  imagePlaceholder: {
    width: 110,
    minHeight: 110,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 4,
    lineHeight: 20,
  },
  excerpt: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
  },
});
