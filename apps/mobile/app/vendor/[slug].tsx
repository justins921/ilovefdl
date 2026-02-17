import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Vendor, Product } from '@ilovefdl/shared';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

export default function VendorStorefrontScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      api.getVendor(slug),
      api.getProducts({ vendorId: slug, limit: 20 }),
    ])
      .then(([vendorRes, productsRes]) => {
        setVendor(vendorRes.data);
        setProducts(productsRes.data);
        setTotalPages(productsRes.totalPages);
      })
      .catch((err) => console.error('Failed to load vendor:', err))
      .finally(() => setLoading(false));
  }, [slug]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages || !vendor) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await api.getProducts({
        vendorId: vendor.id,
        page: nextPage,
        limit: 20,
      });
      setProducts((prev) => [...prev, ...res.data]);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more products:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, totalPages, vendor]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Vendor not found</Text>
      </View>
    );
  }

  const ListHeader = () => (
    <View>
      {/* Banner */}
      {vendor.bannerUrl ? (
        <Image
          source={{ uri: vendor.bannerUrl }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.bannerPlaceholder}>
          <Ionicons name="storefront-outline" size={48} color="#ccc" />
        </View>
      )}

      {/* Vendor Info */}
      <View style={styles.vendorInfo}>
        {vendor.logoUrl && (
          <Image source={{ uri: vendor.logoUrl }} style={styles.logo} />
        )}
        <Text style={styles.vendorName}>{vendor.businessName}</Text>
        {vendor.description && (
          <Text style={styles.vendorDescription}>{vendor.description}</Text>
        )}

        {/* Contact Row */}
        <View style={styles.contactRow}>
          {vendor.address && (
            <View style={styles.contactItem}>
              <Ionicons name="location-outline" size={14} color="#999" />
              <Text style={styles.contactText}>{vendor.address}</Text>
            </View>
          )}
          {vendor.phone && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL(`tel:${vendor.phone}`)}
            >
              <Ionicons name="call-outline" size={14} color={COLORS.teal} />
              <Text style={[styles.contactText, { color: COLORS.teal }]}>
                {vendor.phone}
              </Text>
            </TouchableOpacity>
          )}
          {vendor.website && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL(vendor.website!)}
            >
              <Ionicons name="globe-outline" size={14} color={COLORS.teal} />
              <Text style={[styles.contactText, { color: COLORS.teal }]}>
                Website
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Products Title */}
      <View style={styles.productsHeader}>
        <Text style={styles.productsTitle}>Products</Text>
        <Text style={styles.productsCount}>
          {products.length} item{products.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={products}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.grid}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<ListHeader />}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <ProductCard product={item} />
        </View>
      )}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={COLORS.teal} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptySubtitle}>
            This vendor hasn't listed any products.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
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
  bannerImage: {
    width: SCREEN_WIDTH,
    height: 180,
  },
  bannerPlaceholder: {
    width: SCREEN_WIDTH,
    height: 140,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorInfo: {
    backgroundColor: COLORS.white,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginTop: -52,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.lightGray,
  },
  vendorName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 10,
    textAlign: 'center',
  },
  vendorDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  contactRow: {
    marginTop: 14,
    gap: 8,
    alignItems: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 13,
    color: '#999',
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 12,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  productsCount: {
    fontSize: 13,
    color: '#999',
  },
  grid: {
    backgroundColor: COLORS.lightGray,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: COLUMN_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
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
  },
});
