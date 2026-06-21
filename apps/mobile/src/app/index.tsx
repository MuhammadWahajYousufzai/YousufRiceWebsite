import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Product } from "@repo/types";
import {
  calculatePrice,
  formatCurrency,
  getPricePerKg,
  groupProductsByCatalogCategory,
  isColdDrinkBundleProduct,
  shouldHideThreeKgBag,
  shouldShowColdDrinkBadge,
  shouldShowPremiumBadge,
} from "@repo/utils";

import { Button } from "@repo/ui";
import type { ProductWithImage } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useLiveCatalog } from "@/hooks/use-live-catalog";

type BagSize = 3 | 5 | 10 | 25;

const ramadanOfferEnabled = process.env.EXPO_PUBLIC_ENABLE_RAMADAN_OFFER === "true";
const coldDrinkBundleEnabled = process.env.EXPO_PUBLIC_ENABLE_COLD_DRINK_BUNDLE === "true";

const emptyBags = {
  kg3: 0,
  kg5: 0,
  kg10: 0,
  kg25: 0,
};

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bannerWidth = Math.max(320, width - 32);
  const scrollRef = useRef<ScrollView>(null);
  const { addBag, getItem, getTotalItems, removeBag } = useCart();
  const { banners, error, loading, products, refresh, refreshing, updatedAt } = useLiveCatalog();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithImage | null>(null);
  const [selectedBundle, setSelectedBundle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.name} ${product.description ?? ""}`.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  const groupedProducts = useMemo(
    () => groupProductsByCatalogCategory(filteredProducts),
    [filteredProducts],
  );

  const bundleProducts = useMemo(
    () => filteredProducts.filter(isColdDrinkBundleProduct),
    [filteredProducts],
  );

  const selectedCartItem = selectedProduct
    ? getItem(selectedProduct.$id, selectedBundle)
    : undefined;
  const bagCounts = selectedCartItem?.bags ?? emptyBags;
  const totalKg =
    bagCounts.kg3 * 3 + bagCounts.kg5 * 5 + bagCounts.kg10 * 10 + bagCounts.kg25 * 25;
  const pricePerKg = selectedProduct ? getPricePerKg(selectedProduct, totalKg || 1) : 0;
  const totalPrice = selectedProduct ? calculatePrice(selectedProduct, totalKg || 0) : 0;

  const announcementText = ramadanOfferEnabled
    ? "HURRY! Offer Ends Soon: Get 1kg FREE Rice for every 15kg. Free Delivery across Karachi."
    : "Yousuf Rice 2026 - Premium rice with Free Delivery across Karachi.";

  const handleBannerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width || 1;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveBannerIndex(index);
  };

  const openProduct = (product: ProductWithImage, isBundle = false) => {
    setSelectedProduct(product);
    setSelectedBundle(isBundle);
  };

  const closeProduct = () => {
    setSelectedProduct(null);
    setSelectedBundle(false);
  };

  const handleAddBag = (bagSize: BagSize) => {
    if (!selectedProduct || !selectedProduct.available) return;
    addBag(selectedProduct, bagSize, selectedBundle);
  };

  const handleRemoveBag = (bagSize: BagSize) => {
    if (!selectedProduct) return;
    removeBag(selectedProduct.$id, bagSize, selectedBundle);
  };

  const handleBuyNow = () => {
    if (!selectedProduct || totalKg === 0) return;
    closeProduct();
    router.push("/explore");
  };

  const handleShareProduct = async () => {
    if (!selectedProduct) return;
    await Share.share({
      message: `${selectedProduct.name} from Yousuf Rice — from ${formatCurrency(getPricePerKg(selectedProduct, 5))}/kg. Cash on Delivery across Karachi. https://yousufrice.com/products/${selectedProduct.$id}`,
      title: selectedProduct.name,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 120 + insets.bottom + 24 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh("manual")} />}
      >
        <View style={styles.announcementBar}>
          <Text style={styles.announcementText}>{announcementText}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => scrollRef.current?.scrollTo({ y: 360, animated: true })}
            style={styles.announcementButton}
          >
            <Text style={styles.announcementButtonText}>Order now</Text>
          </Pressable>
        </View>

        <View style={styles.brandHeader}>
          <Text style={styles.brandName}>Yousuf Rice</Text>
          <Text style={styles.brandSubtitle}>Fresh premium rice delivered cash on delivery.</Text>
        </View>

        <View style={styles.bannerShell}>
          {banners.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                onMomentumScrollEnd={handleBannerScroll}
                showsHorizontalScrollIndicator={false}
              >
                {banners.map((banner) => (
                  <Image
                    key={banner.$id}
                    source={{ uri: banner.url }}
                    style={[styles.bannerImage, { width: bannerWidth }]}
                    contentFit="contain"
                    transition={180}
                  />
                ))}
              </ScrollView>
              <View style={styles.bannerDots}>
                {banners.map((banner, index) => (
                  <View
                    key={banner.$id}
                    style={[
                      styles.bannerDot,
                      index === activeBannerIndex && styles.bannerDotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.bannerEmpty}>
              <Text style={styles.bannerEmptyTitle}>No banner images found</Text>
              <Text style={styles.bannerEmptyText}>Pull down to refresh after uploading banners.</Text>
            </View>
          )}
        </View>

        <View style={styles.liveStrip}>
          <View>
            <Text style={styles.liveStripLabel}>Live catalog</Text>
            <Text style={styles.liveStripText}>
              {loading ? "Loading products" : `${products.length} available products`}
            </Text>
          </View>
          <View style={styles.cartPill}>
            <Text style={styles.cartPillText}>{getTotalItems()} bags</Text>
          </View>
        </View>

        <View style={styles.searchShell}>
          <Text style={styles.searchLabel}>Search the catalog</Text>
          <TextInput
            accessibilityLabel="Search rice products"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setSearchQuery}
            placeholder="Basmati, sela, premium…"
            placeholderTextColor="#A3A5B5"
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
          {!!searchQuery && (
            <Text style={styles.searchResultText}>
              {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"} found
            </Text>
          )}
        </View>

        {updatedAt && (
          <Text style={styles.updatedAt}>
            Updated {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not refresh catalog</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button variant="outline" onPress={() => refresh("manual")}>
              Try again
            </Button>
          </View>
        )}

        {coldDrinkBundleEnabled && bundleProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionRule} />
              <Text style={styles.bundleTitle}>Cold Drink Bundles</Text>
              <View style={styles.sectionRule} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
              {bundleProducts.map((product) => (
                <ProductCard
                  key={`bundle-${product.$id}`}
                  product={product}
                  imageUrl={product.bundleImageUrl ?? product.imageUrl}
                  badgeLabel="Free Cold Drink"
                  onPress={() => openProduct(product, true)}
                  compact
                />
              ))}
            </ScrollView>
          </View>
        )}

        {groupedProducts.map(({ category, products: categoryProducts }) => (
          <View key={category} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionRule} />
              <Text style={styles.sectionTitle}>{category}</Text>
              <View style={styles.sectionRule} />
            </View>

            <View style={styles.productGrid}>
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.$id}
                  product={product}
                  imageUrl={product.imageUrl}
                  badgeLabel={shouldShowColdDrinkBadge(product) ? "Free Cold Drink" : undefined}
                  onPress={() => openProduct(product)}
                />
              ))}
            </View>
          </View>
        ))}

        {!loading && filteredProducts.length === 0 && !error && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{searchQuery ? "No matching rice" : "No Products Available"}</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? "Try a shorter product name or clear the search." : "Check back soon for our premium rice selection."}
            </Text>
            {!!searchQuery && <Button variant="outline" onPress={() => setSearchQuery("")}>Clear Search</Button>}
          </View>
        )}
      </ScrollView>

      <ProductSelectionModal
        bagCounts={bagCounts}
        isBundle={selectedBundle}
        onAddBag={handleAddBag}
        onBuyNow={handleBuyNow}
        onClose={closeProduct}
        onRemoveBag={handleRemoveBag}
        onShare={handleShareProduct}
        pricePerKg={pricePerKg}
        product={selectedProduct}
        totalKg={totalKg}
        totalPrice={totalPrice}
        visible={Boolean(selectedProduct)}
      />
    </SafeAreaView>
  );
}

function ProductCard({
  badgeLabel,
  compact,
  imageUrl,
  onPress,
  product,
}: {
  badgeLabel?: string;
  compact?: boolean;
  imageUrl?: string;
  onPress: () => void;
  product: Product;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!product.available}
      onPress={onPress}
      style={[styles.productCard, compact && styles.compactProductCard]}
    >
      <View style={styles.productImageShell}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.productImage} contentFit="cover" transition={180} />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>YR</Text>
          </View>
        )}
        {!product.available && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>Out of Stock</Text>
          </View>
        )}
        {ramadanOfferEnabled && product.available && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>Post-Eid Special</Text>
          </View>
        )}
        {badgeLabel && product.available && (
          <View style={styles.cornerBadge}>
            <Text style={styles.cornerBadgeText}>{badgeLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.productContent}>
        <View style={styles.productTitleRow}>
          <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
          {shouldShowPremiumBadge(product) && <Text style={styles.premiumBadge}>Premium</Text>}
        </View>
        {!!product.description && (
          <Text numberOfLines={3} style={styles.productDescription}>{product.description}</Text>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>{formatCurrency(getPricePerKg(product, 5))}/kg</Text>
          <Text style={styles.orderNowText}>Order Now</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ProductSelectionModal({
  bagCounts,
  isBundle,
  onAddBag,
  onBuyNow,
  onClose,
  onRemoveBag,
  onShare,
  pricePerKg,
  product,
  totalKg,
  totalPrice,
  visible,
}: {
  bagCounts: typeof emptyBags;
  isBundle: boolean;
  onAddBag: (bagSize: BagSize) => void;
  onBuyNow: () => void;
  onClose: () => void;
  onRemoveBag: (bagSize: BagSize) => void;
  onShare: () => void;
  pricePerKg: number;
  product: ProductWithImage | null;
  totalKg: number;
  totalPrice: number;
  visible: boolean;
}) {
  if (!product) return null;

  const bagRows = ([
    { label: "3kg Bag", size: 3, value: bagCounts.kg3 },
    { label: "5kg Bag", popular: "Popular", size: 5, value: bagCounts.kg5 },
    { label: "10kg Bag", popular: isBundle ? "+ 1L Cold Drink Free" : "Great Deal", size: 10, value: bagCounts.kg10 },
    { label: "25kg Bag", popular: "Best Value", size: 25, value: bagCounts.kg25 },
  ] satisfies Array<{ label: string; popular?: string; size: BagSize; value: number }>).filter((row) => {
    if (isBundle) return row.size === 10;
    if (row.size === 3) return !shouldHideThreeKgBag(product);
    return true;
  });

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea}>
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable accessibilityRole="button" onPress={onShare} style={styles.shareButton}>
              <Text style={styles.shareButtonText}>Share</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.detailImageShell}>
            {product.imageUrl ? (
              <Image
                source={{ uri: isBundle ? product.bundleImageUrl ?? product.imageUrl : product.imageUrl }}
                style={styles.detailImage}
                contentFit="contain"
              />
            ) : (
              <View style={styles.detailFallback}>
                <Text style={styles.detailFallbackText}>Yousuf Rice</Text>
              </View>
            )}
          </View>

          <View style={styles.detailCard}>
            <View style={styles.productTitleRow}>
              <Text style={styles.detailTitle}>{product.name}</Text>
              {shouldShowPremiumBadge(product) && <Text style={styles.premiumBadge}>Premium</Text>}
            </View>
            {isBundle && <Text style={styles.bundleNotice}>You get 1 free 1L cold drink for every 10kg bag.</Text>}
            {!!product.description && <Text style={styles.detailDescription}>{product.description}</Text>}
          </View>

          {product.has_tier_pricing && (
            <View style={styles.tierRow}>
              {!!product.tier_2_4kg_price && (
                <Text style={styles.tierPill}>2-4kg: {formatCurrency(product.tier_2_4kg_price)}/kg</Text>
              )}
              {!!product.tier_5_9kg_price && (
                <Text style={styles.tierPill}>5-9kg: {formatCurrency(product.tier_5_9kg_price)}/kg</Text>
              )}
              {!!product.tier_10kg_up_price && (
                <Text style={styles.tierPillStrong}>10+kg: {formatCurrency(product.tier_10kg_up_price)}/kg</Text>
              )}
            </View>
          )}

          <View style={styles.quantityCard}>
            <Text style={styles.quantityTitle}>Choose Your Quantity</Text>
            {bagRows.map((row) => (
              <View key={row.size} style={styles.bagRow}>
                <View style={styles.bagInfo}>
                  <View style={styles.bagWeight}>
                    <Text style={styles.bagWeightText}>{row.size}kg</Text>
                  </View>
                  <View>
                    <Text style={styles.bagLabel}>{row.label}</Text>
                    <Text style={styles.bagPrice}>{formatCurrency(getPricePerKg(product, row.size))}/kg</Text>
                    {!!row.popular && <Text style={styles.bagPill}>{row.popular}</Text>}
                  </View>
                </View>

                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={row.value === 0}
                    onPress={() => onRemoveBag(row.size)}
                    style={[styles.stepperButton, row.value === 0 && styles.stepperDisabled]}
                  >
                    <Text style={styles.stepperMinus}>-</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{row.value}</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!product.available}
                    onPress={() => onAddBag(row.size)}
                    style={styles.stepperButtonAdd}
                  >
                    <Text style={styles.stepperPlus}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          {totalKg > 0 && (
            <View style={styles.totalPanel}>
              <View>
                <Text style={styles.totalPanelLabel}>Total Amount</Text>
                <Text style={styles.totalPanelValue}>{formatCurrency(totalPrice)}</Text>
              </View>
              <View style={styles.totalPanelRight}>
                <Text style={styles.totalPanelLabel}>{totalKg}kg selected</Text>
                <Text style={styles.totalPanelPrice}>{formatCurrency(pricePerKg)}/kg</Text>
              </View>
            </View>
          )}

          <Button disabled={!product.available || totalKg === 0} size="lg" onPress={onBuyNow}>
            {totalKg > 0 ? `Buy Now - ${formatCurrency(totalPrice)}` : "Select bags to continue"}
          </Button>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const brandBlue = "#27247b";
const brandYellow = "#D4AD54";

const styles = StyleSheet.create({
  announcementBar: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  announcementButton: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  announcementButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  announcementText: {
    color: "#111827",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  bagInfo: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  bagLabel: {
    color: brandBlue,
    fontSize: 15,
    fontWeight: "900",
  },
  bagPill: {
    alignSelf: "flex-start",
    backgroundColor: "#F6EDD7",
    borderRadius: 999,
    color: "#735A23",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bagPrice: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  bagRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  bagWeight: {
    alignItems: "center",
    backgroundColor: brandBlue,
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  bagWeightText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  bannerDot: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  bannerDotActive: {
    backgroundColor: brandYellow,
    width: 18,
  },
  bannerDots: {
    bottom: 10,
    flexDirection: "row",
    gap: 6,
    left: 0,
    justifyContent: "center",
    position: "absolute",
    right: 0,
  },
  bannerEmpty: {
    alignItems: "center",
    aspectRatio: 3 / 1,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    width: "100%",
  },
  bannerEmptyText: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  bannerEmptyTitle: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
  },
  bannerImage: {
    aspectRatio: 3 / 1,
    backgroundColor: "#e2e8f0",
  },
  bannerShell: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  brandHeader: {
    gap: 5,
  },
  brandName: {
    color: brandBlue,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 39,
  },
  brandSubtitle: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  bundleNotice: {
    backgroundColor: "#dbeafe",
    borderColor: "#38bdf8",
    borderRadius: 8,
    borderWidth: 1,
    color: "#1e3a8a",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 12,
    padding: 10,
  },
  bundleTitle: {
    color: "#2563eb",
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
    textAlign: "center",
  },
  cardFooter: {
    alignItems: "center",
    borderTopColor: "#e5e7eb",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
  },
  cartPill: {
    backgroundColor: brandYellow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cartPillText: {
    color: brandBlue,
    fontSize: 13,
    fontWeight: "900",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  closeButtonText: {
    color: brandBlue,
    fontSize: 14,
    fontWeight: "900",
  },
  compactProductCard: {
    width: 278,
  },
  container: {
    gap: 18,
    padding: 16,
    paddingBottom: 120,
  },
  cornerBadge: {
    backgroundColor: "#f59e0b",
    borderBottomLeftRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    right: 0,
    top: 0,
  },
  cornerBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  detailCard: {
    backgroundColor: "#ffffff",
    borderColor: "#fef08a",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  detailDescription: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  detailFallback: {
    alignItems: "center",
    backgroundColor: "#fefce8",
    flex: 1,
    justifyContent: "center",
  },
  detailFallbackText: {
    color: brandBlue,
    fontSize: 22,
    fontWeight: "900",
  },
  detailImage: {
    height: "100%",
    width: "100%",
  },
  detailImageShell: {
    aspectRatio: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    overflow: "hidden",
  },
  detailTitle: {
    color: brandBlue,
    flex: 1,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  errorText: {
    color: "#7f1d1d",
    fontSize: 14,
    lineHeight: 20,
  },
  errorTitle: {
    color: "#991b1b",
    fontSize: 16,
    fontWeight: "800",
  },
  horizontalCards: {
    gap: 14,
    paddingRight: 16,
  },
  imageFallback: {
    alignItems: "center",
    backgroundColor: "#fefce8",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  imageFallbackText: {
    color: brandBlue,
    fontSize: 32,
    fontWeight: "900",
  },
  liveStrip: {
    alignItems: "center",
    backgroundColor: brandBlue,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  liveStripLabel: {
    color: "#c7d2fe",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  liveStripText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  modalContainer: {
    gap: 14,
    padding: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalSafeArea: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  offerBadge: {
    backgroundColor: brandYellow,
    borderRadius: 999,
    left: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: "absolute",
    top: 8,
  },
  offerBadgeText: {
    color: brandBlue,
    fontSize: 10,
    fontWeight: "900",
  },
  orderNowText: {
    backgroundColor: brandBlue,
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  premiumBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f59e0b",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  priceText: {
    color: brandBlue,
    fontSize: 17,
    fontWeight: "900",
  },
  productCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  productContent: {
    padding: 13,
  },
  productDescription: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  productGrid: {
    gap: 14,
  },
  productImage: {
    height: "100%",
    width: "100%",
  },
  productImageShell: {
    aspectRatio: 4 / 3,
    backgroundColor: "#e2e8f0",
    position: "relative",
    width: "100%",
  },
  productName: {
    color: brandBlue,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  productTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  quantityCard: {
    backgroundColor: "#ffffff",
    borderColor: "#fef08a",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  quantityTitle: {
    color: brandBlue,
    fontSize: 18,
    fontWeight: "900",
  },
  safeArea: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CFD0DA",
    borderRadius: 12,
    borderWidth: 1,
    color: "#1D1E28",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchLabel: {
    color: "#27247B",
    fontSize: 13,
    fontWeight: "900",
  },
  searchResultText: {
    color: "#7B7D8F",
    fontSize: 12,
    fontWeight: "700",
  },
  searchShell: {
    backgroundColor: "#F7F7FC",
    borderColor: "#DCDDF2",
    borderRadius: 14,
    borderWidth: 1,
    gap: 7,
    padding: 12,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 8,
  },
  sectionRule: {
    backgroundColor: brandYellow,
    flex: 1,
    height: 2,
  },
  sectionTitle: {
    color: brandBlue,
    flexShrink: 1,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  shareButton: {
    backgroundColor: "#FBF8F0",
    borderColor: "#EDDBAE",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  shareButtonText: {
    color: "#735A23",
    fontSize: 13,
    fontWeight: "900",
  },
  soldOutOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  soldOutText: {
    backgroundColor: "#dc2626",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stepper: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  stepperButton: {
    alignItems: "center",
    borderColor: "#d1d5db",
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  stepperButtonAdd: {
    alignItems: "center",
    backgroundColor: brandYellow,
    borderColor: brandYellow,
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  stepperDisabled: {
    opacity: 0.45,
  },
  stepperMinus: {
    color: "#dc2626",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  stepperPlus: {
    color: brandBlue,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 23,
  },
  stepperValue: {
    color: brandBlue,
    fontSize: 16,
    fontWeight: "900",
    minWidth: 18,
    textAlign: "center",
  },
  tierPill: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    color: brandBlue,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  tierPillStrong: {
    backgroundColor: brandYellow,
    borderColor: brandYellow,
    borderRadius: 8,
    borderWidth: 1,
    color: brandBlue,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  tierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  totalPanel: {
    alignItems: "center",
    backgroundColor: brandBlue,
    borderColor: brandYellow,
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  totalPanelLabel: {
    color: "#c7d2fe",
    fontSize: 12,
    fontWeight: "800",
  },
  totalPanelPrice: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  totalPanelRight: {
    alignItems: "flex-end",
  },
  totalPanelValue: {
    color: brandYellow,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },
  updatedAt: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
});
