import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@ilovefdl/shared';

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const hasDiscount =
    product.compareAtPrice !== null && product.compareAtPrice > product.price;

  const handlePress = () => {
    router.push(`/product/${product.slug}`);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Image */}
      {product.images.length > 0 ? (
        <Image
          source={{ uri: product.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={28} color="#ccc" />
        </View>
      )}

      {/* Discount Badge */}
      {hasDiscount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>Sale</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        {product.vendor && (
          <Text style={styles.vendorName} numberOfLines={1}>
            {product.vendor.businessName}
          </Text>
        )}
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {hasDiscount && (
            <Text style={styles.comparePrice}>
              {formatPrice(product.compareAtPrice!)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.lightGray,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  info: {
    padding: 10,
  },
  vendorName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 3,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  comparePrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
});
