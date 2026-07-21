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
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

import { AppButton } from "@/components/app-button";
import { Image } from "@/components/app-image";
import { AppScrollView } from "@/components/screen";
import { useLiveCatalog } from "@/hooks/use-live-catalog";
import type { ProductWithImage } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import {
  trackMobileAddToCart,
  trackMobileViewContent,
} from "@/lib/meta-events";

type BagSize = 3 | 5 | 10 | 25;

const ramadanOfferEnabled =
  process.env.EXPO_PUBLIC_ENABLE_RAMADAN_OFFER === "true";
const coldDrinkBundleEnabled =
  process.env.EXPO_PUBLIC_ENABLE_COLD_DRINK_BUNDLE === "true";
const emptyBags = { kg3: 0, kg5: 0, kg10: 0, kg25: 0 };

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const { addBag, getItem, getTotalItems, removeBag } = useCart();
  const { banners, error, loading, products, refresh, refreshing, updatedAt } =
    useLiveCatalog();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithImage | null>(null);
  const [selectedBundle, setSelectedBundle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query
      ? products.filter((product) =>
          `${product.name} ${product.description ?? ""}`
            .toLowerCase()
            .includes(query),
        )
      : products;
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
    bagCounts.kg3 * 3 +
    bagCounts.kg5 * 5 +
    bagCounts.kg10 * 10 +
    bagCounts.kg25 * 25;
  const pricePerKg = selectedProduct
    ? getPricePerKg(selectedProduct, totalKg || 1)
    : 0;
  const totalPrice = selectedProduct
    ? calculatePrice(selectedProduct, totalKg)
    : 0;

  const openProduct = (product: ProductWithImage, isBundle = false) => {
    setSelectedProduct(product);
    setSelectedBundle(isBundle);
    void trackMobileViewContent({
      contentName: product.name,
      contentId: product.$id,
      value: calculatePrice(product, isBundle ? 10 : 5),
    });
  };
  const closeProduct = () => {
    setSelectedProduct(null);
    setSelectedBundle(false);
  };
  const handleAddBag = (bagSize: BagSize) => {
    if (!selectedProduct?.available) return;
    addBag(selectedProduct, bagSize, selectedBundle);
    void trackMobileAddToCart({
      contentName: selectedProduct.name,
      contentId: selectedProduct.$id,
      value: calculatePrice(selectedProduct, bagSize),
      quantity: 1,
    });
  };
  const handleRemoveBag = (bagSize: BagSize) => {
    if (selectedProduct)
      removeBag(selectedProduct.$id, bagSize, selectedBundle);
  };
  const handleShareProduct = async () => {
    if (!selectedProduct) return;
    await Share.share({
      message: `${selectedProduct.name} from Yousuf Rice — from ${formatCurrency(getPricePerKg(selectedProduct, 5))}/kg. Cash on Delivery across Karachi.`,
      title: selectedProduct.name,
    });
  };

  return (
    <>
      <AppScrollView
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh("manual")}
          />
        }
      >
        <View className="gap-5 px-4 pb-6 pt-4">
          <View className="flex-row items-center justify-between rounded-card border border-line bg-white px-3 py-3">
            <View className="flex-row items-center gap-3">
              <Image
                source={require("@/assets/images/splash-icon.png")}
                contentFit="contain"
                className="h-10 w-[62px]"
              />
              <View>
                <Text className="text-[15px] font-extrabold text-brand-800">
                  Yousuf Rice
                </Text>
                <Text className="mt-0.5 text-[11px] font-semibold text-muted">
                  Karachi delivery
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${getTotalItems()} bags in cart`}
              onPress={() => router.push("/explore")}
              className="relative min-h-[42px] justify-center rounded-full bg-brand-800 px-5 active:bg-brand-900"
            >
              <Text className="text-[13px] font-extrabold text-white">Bag</Text>
              {getTotalItems() > 0 && (
                <View className="absolute -right-1.5 -top-2 min-w-5 items-center rounded-full bg-gold-400 px-1.5 py-1">
                  <Text className="text-[11px] font-extrabold text-brand-800">
                    {getTotalItems()}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <View className="flex-row items-center gap-3 rounded-card border border-line bg-white px-3 py-3">
            <Text className="flex-1 text-[12px] font-bold leading-[17px] text-ink">
              {ramadanOfferEnabled
                ? "Get 1kg free for every 15kg. Free Karachi delivery."
                : "Premium rice, clear prices, and free Karachi delivery."}
            </Text>
            <Pressable
              onPress={() =>
                scrollRef.current?.scrollTo({ y: 360, animated: true })
              }
              className="rounded-full bg-brand-800 px-3 py-2"
            >
              <Text className="text-[12px] font-bold text-white">
                Order now
              </Text>
            </Pressable>
          </View>

          <View className="gap-2">
            <Text className="text-[30px] font-extrabold leading-[35px] text-brand-800">
              Premium rice for Karachi homes
            </Text>
            <Text className="text-[15px] font-medium leading-[22px] text-body">
              Aged basmati, honest per-kg pricing, and Cash on Delivery at your
              doorstep.
            </Text>
          </View>

          <View className="flex-row overflow-hidden rounded-card border border-line bg-white">
            {[
              ["Free", "Karachi delivery"],
              ["COD", "Pay on arrival"],
              ["Aged", "Best rice"],
            ].map(([value, label], index) => (
              <View
                key={value}
                className={`flex-1 px-2 py-3 ${index > 0 ? "border-l border-line" : ""}`}
              >
                <Text className="text-center text-[16px] font-extrabold text-brand-800">
                  {value}
                </Text>
                <Text className="mt-1 text-center text-[10px] font-semibold text-muted">
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View className="overflow-hidden rounded-card bg-wash">
            {banners.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(
                    event: NativeSyntheticEvent<NativeScrollEvent>,
                  ) =>
                    setActiveBannerIndex(
                      Math.round(
                        event.nativeEvent.contentOffset.x /
                          (event.nativeEvent.layoutMeasurement.width || 1),
                      ),
                    )
                  }
                >
                  {banners.map((banner) => (
                    <Image
                      key={banner.$id}
                      source={{ uri: banner.url }}
                      contentFit="contain"
                      transition={180}
                      className="aspect-[3/1] bg-wash"
                      style={{ width: Math.max(320, width - 32) }}
                    />
                  ))}
                </ScrollView>
                <View className="absolute bottom-2 left-0 right-0 flex-row justify-center gap-1.5">
                  {banners.map((banner, index) => (
                    <View
                      key={banner.$id}
                      className={`h-1.5 rounded-full ${index === activeBannerIndex ? "w-[18px] bg-gold-400" : "w-1.5 bg-white/70"}`}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View className="aspect-[3/1] items-center justify-center">
                <Text className="text-[15px] font-bold text-body">
                  Fresh stock, delivered daily
                </Text>
                <Text className="mt-1 text-[13px] text-muted">
                  Pull down to refresh banners.
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center justify-between rounded-card border border-line bg-white px-4 py-3">
            <View>
              <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-muted">
                Available today
              </Text>
              <Text className="mt-1 text-[17px] font-extrabold text-brand-800">
                {loading
                  ? "Loading products"
                  : `${products.length} available products`}
              </Text>
            </View>
            <Text className="rounded-full bg-gold-100 px-3 py-2 text-[12px] font-extrabold text-gold-700">
              Cash on delivery
            </Text>
          </View>

          <View className="gap-2 rounded-card border border-line bg-white p-3">
            <Text className="text-[12px] font-extrabold uppercase tracking-[1px] text-muted">
              Search the catalog
            </Text>
            <TextInput
              accessibilityLabel="Search rice products"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={setSearchQuery}
              placeholder="Basmati, sela, premium…"
              placeholderTextColor="#A3A5B5"
              returnKeyType="search"
              value={searchQuery}
              className="rounded-xl border border-line bg-canvas px-3 py-3 text-[15px] text-ink"
            />
            {!!searchQuery && (
              <Text className="text-[12px] font-semibold text-muted">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "product" : "products"} found
              </Text>
            )}
          </View>

          {updatedAt && (
            <Text className="text-[11px] font-semibold text-muted">
              Updated{" "}
              {new Date(updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
          {error && (
            <View className="gap-2 rounded-card border border-coral-100 bg-coral-50 p-4">
              <Text className="text-[16px] font-extrabold text-coral-700">
                Could not refresh catalog
              </Text>
              <Text className="text-[14px] leading-5 text-coral-700">
                {error}
              </Text>
              <AppButton
                size="sm"
                variant="outline"
                onPress={() => refresh("manual")}
              >
                Try again
              </AppButton>
            </View>
          )}

          {coldDrinkBundleEnabled && bundleProducts.length > 0 && (
            <ProductSection
              title="Cold Drink Bundles"
              products={bundleProducts}
              horizontal
              badgeLabel="Free cold drink"
              onPress={(product) => openProduct(product, true)}
            />
          )}
          {groupedProducts.map(({ category, products: categoryProducts }) => (
            <ProductSection
              key={category}
              title={category}
              products={categoryProducts}
              onPress={openProduct}
            />
          ))}

          {!loading && filteredProducts.length === 0 && !error && (
            <View className="gap-2 rounded-card border border-line bg-white p-4">
              <Text className="text-[17px] font-extrabold text-ink">
                {searchQuery ? "No matching rice" : "No products available"}
              </Text>
              <Text className="text-[14px] leading-5 text-body">
                {searchQuery
                  ? "Try a shorter product name or clear the search."
                  : "Check back soon for our premium rice selection."}
              </Text>
              {!!searchQuery && (
                <AppButton
                  size="sm"
                  variant="outline"
                  onPress={() => setSearchQuery("")}
                >
                  Clear search
                </AppButton>
              )}
            </View>
          )}
        </View>
      </AppScrollView>

      <ProductSelectionModal
        bagCounts={bagCounts}
        isBundle={selectedBundle}
        onAddBag={handleAddBag}
        onBuyNow={() => {
          if (totalKg > 0) {
            closeProduct();
            router.push("/explore");
          }
        }}
        onClose={closeProduct}
        onRemoveBag={handleRemoveBag}
        onShare={handleShareProduct}
        pricePerKg={pricePerKg}
        product={selectedProduct}
        totalKg={totalKg}
        totalPrice={totalPrice}
        visible={Boolean(selectedProduct)}
      />
    </>
  );
}

function ProductSection({
  badgeLabel,
  horizontal,
  onPress,
  products,
  title,
}: {
  badgeLabel?: string;
  horizontal?: boolean;
  onPress: (product: ProductWithImage, isBundle?: boolean) => void;
  products: ProductWithImage[];
  title: string;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-line" />
        <Text className="text-[18px] font-extrabold text-brand-800">
          {title}
        </Text>
        <View className="h-px flex-1 bg-line" />
      </View>
      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 pr-4"
        >
          {products.map((product) => (
            <ProductCard
              key={product.$id}
              compact
              product={product}
              badgeLabel={badgeLabel}
              onPress={() => onPress(product, true)}
            />
          ))}
        </ScrollView>
      ) : (
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {products.map((product) => (
            <ProductCard
              key={product.$id}
              product={product}
              badgeLabel={
                shouldShowColdDrinkBadge(product)
                  ? "Free cold drink"
                  : undefined
              }
              onPress={() => onPress(product)}
            />
          ))}
        </View>
      )}
    </View>
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
  product: ProductWithImage;
}) {
  const source = imageUrl ?? product.imageUrl;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!product.available}
      onPress={onPress}
      className={`${compact ? "w-[280px]" : "w-[48%]"} overflow-hidden rounded-card border border-line bg-white active:opacity-85`}
    >
      <View className="relative aspect-square bg-wash">
        {source ? (
          <Image
            source={{ uri: source }}
            contentFit="cover"
            transition={180}
            className="h-full w-full"
          />
        ) : (
          <View className="h-full items-center justify-center bg-gold-50">
            <Text className="text-[32px] font-extrabold text-brand-800">
              YR
            </Text>
          </View>
        )}
        {!product.available && (
          <View className="absolute inset-0 items-center justify-center bg-black/35">
            <Text className="rounded-full bg-white px-3 py-2 text-[11px] font-extrabold text-muted">
              Out of stock
            </Text>
          </View>
        )}
        {badgeLabel && product.available && (
          <Text className="absolute left-2 top-2 rounded-md bg-coral-500 px-2 py-1 text-[10px] font-bold text-white">
            {badgeLabel}
          </Text>
        )}
      </View>
      <View className="gap-1.5 p-3">
        <View className="flex-row items-start gap-1">
          <Text
            numberOfLines={2}
            className="flex-1 text-[13px] font-bold leading-[18px] text-ink"
          >
            {product.name}
          </Text>
          {shouldShowPremiumBadge(product) && (
            <Text className="rounded-md bg-gold-100 px-1.5 py-1 text-[9px] font-extrabold text-gold-700">
              Premium
            </Text>
          )}
        </View>
        {!!product.description && (
          <Text numberOfLines={2} className="text-[11px] leading-4 text-muted">
            {product.description}
          </Text>
        )}
        <View className="mt-2 flex-row items-center justify-between border-t border-line pt-2">
          <View>
            <Text className="text-[10px] font-semibold uppercase tracking-[.7px] text-muted">
              Per kg
            </Text>
            <Text className="mt-0.5 text-[16px] font-extrabold text-brand-800">
              {formatCurrency(getPricePerKg(product, 5))}
            </Text>
          </View>
          <Text className="rounded-full bg-brand-800 px-3 py-2 text-[11px] font-bold text-white">
            Add
          </Text>
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
  const bagRows = (
    [
      { label: "3kg bag", size: 3, value: bagCounts.kg3 },
      { label: "5kg bag", tag: "Popular", size: 5, value: bagCounts.kg5 },
      {
        label: "10kg bag",
        tag: isBundle ? "+ 1L cold drink free" : "Great deal",
        size: 10,
        value: bagCounts.kg10,
      },
      { label: "25kg bag", tag: "Best value", size: 25, value: bagCounts.kg25 },
    ] satisfies Array<{
      label: string;
      size: BagSize;
      tag?: string;
      value: number;
    }>
  ).filter((row) =>
    isBundle
      ? row.size === 10
      : row.size !== 3 || !shouldHideThreeKgBag(product),
  );
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
        <ScrollView contentContainerClassName="pb-6" className="flex-1">
          <View className="gap-4 p-4">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={onShare}
                className="rounded-full border border-line bg-white px-4 py-2.5"
              >
                <Text className="text-[14px] font-bold text-brand-700">
                  Share
                </Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                className="rounded-full bg-brand-100 px-4 py-2.5"
              >
                <Text className="text-[14px] font-bold text-brand-800">
                  Close
                </Text>
              </Pressable>
            </View>
            <View className="aspect-square overflow-hidden rounded-card bg-wash">
              {product.imageUrl ? (
                <Image
                  source={{
                    uri: isBundle
                      ? (product.bundleImageUrl ?? product.imageUrl)
                      : product.imageUrl,
                  }}
                  contentFit="contain"
                  className="h-full w-full"
                />
              ) : (
                <View className="h-full items-center justify-center bg-gold-50">
                  <Text className="text-[22px] font-extrabold text-brand-800">
                    Yousuf Rice
                  </Text>
                </View>
              )}
            </View>
            <View className="gap-2 rounded-card border border-line bg-white p-4">
              <View className="flex-row items-start gap-2">
                <Text className="flex-1 text-[24px] font-extrabold leading-[29px] text-brand-800">
                  {product.name}
                </Text>
                {shouldShowPremiumBadge(product) && (
                  <Text className="rounded-md bg-gold-100 px-2 py-1 text-[10px] font-extrabold text-gold-700">
                    Premium
                  </Text>
                )}
              </View>
              {isBundle && (
                <Text className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-[13px] font-bold leading-5 text-brand-800">
                  Get one free 1L cold drink with every 10kg bag.
                </Text>
              )}
              {!!product.description && (
                <Text className="text-[14px] leading-[21px] text-body">
                  {product.description}
                </Text>
              )}
            </View>
            {product.has_tier_pricing && (
              <View className="flex-row flex-wrap gap-2">
                {[
                  product.tier_2_4kg_price
                    ? `2–4kg: ${formatCurrency(product.tier_2_4kg_price)}/kg`
                    : null,
                  product.tier_5_9kg_price
                    ? `5–9kg: ${formatCurrency(product.tier_5_9kg_price)}/kg`
                    : null,
                  product.tier_10kg_up_price
                    ? `10+kg: ${formatCurrency(product.tier_10kg_up_price)}/kg`
                    : null,
                ]
                  .filter(Boolean)
                  .map((tier) => (
                    <Text
                      key={tier}
                      className="rounded-full bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-700"
                    >
                      {tier}
                    </Text>
                  ))}
              </View>
            )}
            <View className="gap-3 rounded-card border border-line bg-white p-3">
              <Text className="text-[18px] font-extrabold text-brand-800">
                Choose your quantity
              </Text>
              {bagRows.map((row) => (
                <View
                  key={row.size}
                  className="flex-row items-center justify-between rounded-xl border border-line bg-canvas p-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-800">
                      <Text className="text-[12px] font-extrabold text-white">
                        {row.size}kg
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[15px] font-extrabold text-ink">
                        {row.label}
                      </Text>
                      <Text className="mt-0.5 text-[12px] font-semibold text-muted">
                        {formatCurrency(getPricePerKg(product, row.size))}/kg
                      </Text>
                      {row.tag && (
                        <Text className="mt-1 self-start rounded-full bg-gold-100 px-2 py-1 text-[10px] font-bold text-gold-700">
                          {row.tag}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      disabled={row.value === 0}
                      onPress={() => onRemoveBag(row.size)}
                      className={`h-9 w-9 items-center justify-center rounded-full border border-line bg-white ${row.value === 0 ? "opacity-35" : "active:bg-brand-50"}`}
                    >
                      <Text className="text-[18px] font-bold text-brand-800">
                        −
                      </Text>
                    </Pressable>
                    <Text className="min-w-5 text-center text-[15px] font-extrabold text-ink">
                      {row.value}
                    </Text>
                    <Pressable
                      onPress={() => onAddBag(row.size)}
                      className="h-9 w-9 items-center justify-center rounded-full bg-brand-800 active:bg-brand-900"
                    >
                      <Text className="text-[18px] font-bold text-white">
                        +
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            {totalKg > 0 && (
              <View className="flex-row items-center justify-between rounded-card bg-brand-800 p-4">
                <View>
                  <Text className="text-[11px] font-bold uppercase tracking-[.8px] text-brand-200">
                    Total amount
                  </Text>
                  <Text className="mt-1 text-[24px] font-extrabold text-white">
                    {formatCurrency(totalPrice)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[12px] font-semibold text-brand-200">
                    {totalKg}kg selected
                  </Text>
                  <Text className="mt-1 text-[14px] font-bold text-white">
                    {formatCurrency(pricePerKg)}/kg
                  </Text>
                </View>
              </View>
            )}
            <AppButton
              disabled={!product.available || totalKg === 0}
              size="lg"
              onPress={onBuyNow}
            >
              {totalKg > 0
                ? `Buy now · ${formatCurrency(totalPrice)}`
                : "Select bags to continue"}
            </AppButton>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
