import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@ilovefdl/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .getProduct(slug)
      .then((res) => setProduct(res.data))
      .catch((err) => {
        console.error('Failed to load product:', err);
        Alert.alert('Error', 'Could not load product details.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to add items to your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(tabs)/profile') },
      ]);
      return;
    }
    // In a full implementation this would add to a cart context/store
    Alert.alert(
      'Added to Cart',
      `${quantity}x ${product?.name} added to your cart.`,
    );
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  const images = product.images.length > 0 ? product.images : [];
  const hasDiscount =
    product.compareAtPrice !== null && product.compareAtPrice > product.price;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Image Gallery */}
        {images.length > 0 ? (
          <View>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                );
                setActiveImageIndex(index);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              )}
            />
            {images.length > 1 && (
              <View style={styles.imageDots}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === activeImageIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={64} color="#ccc" />
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoSection}>
          {product.vendor && (
            <TouchableOpacity
              onPress={() => router.push(`/vendor/${product.vendor!.slug}`)}
            >
              <Text style={styles.vendorName}>
                {product.vendor.businessName}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>
                {formatPrice(product.compareAtPrice!)}
              </Text>
            )}
          </View>

          {product.categoryTags.length > 0 && (
            <View style={styles.tags}>
              {product.categoryTags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Ionicons
              name={product.inventory > 0 ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={product.inventory > 0 ? '#4caf50' : COLORS.accent}
            />
            <Text
              style={[
                styles.stockText,
                product.inventory <= 0 && styles.outOfStock,
              ]}
            >
              {product.inventory > 0
                ? `${product.inventory} in stock`
                : 'Out of stock'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Add to Cart Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Ionicons name="remove" size={20} color={COLORS.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() =>
              setQuantity((q) => Math.min(product.inventory, q + 1))
            }
          >
            <Ionicons name="add" size={20} color={COLORS.primaryDark} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            product.inventory <= 0 && styles.addToCartDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={product.inventory <= 0}
        >
          <Ionicons name="cart" size={20} color={COLORS.white} />
          <Text style={styles.addToCartText}>
            Add to Cart - {formatPrice(product.price * quantity)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
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
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.7,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  dotActive: {
    backgroundColor: COLORS.teal,
    width: 20,
  },
  infoSection: {
    padding: 20,
  },
  vendorName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primaryDark,
    lineHeight: 30,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  comparePrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  descriptionSection: {
    marginTop: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  stockText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
  },
  outOfStock: {
    color: COLORS.accent,
  },

  // --- Bottom Bar ---
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    gap: 12,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 4,
    height: 44,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    minWidth: 28,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.teal,
    height: 48,
    borderRadius: 12,
  },
  addToCartDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
