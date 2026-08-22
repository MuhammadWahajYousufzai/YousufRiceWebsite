import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  calculatePrice,
  formatCurrency,
  getActiveStorefrontContent,
  getPricePerKg,
  getProductPromotion,
  groupProductsByCatalogCategory,
  shouldHideThreeKgBag,
  shouldShowPremiumBadge,
} from "@repo/utils";

import { AppButton } from "@/components/app-button";
import { Image } from "@/components/app-image";
import { AppScrollView } from "@/components/screen";
import {
  StorefrontAnnouncement,
  StorefrontHeader,
} from "@/components/storefront-header";
import { useLiveCatalog } from "@/hooks/use-live-catalog";
import { useLiveStorefrontContent } from "@/hooks/use-live-storefront-content";
import type { ProductWithImage } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import type { StorefrontContent } from "@repo/types";
import {
  trackMobileAddToCart,
  trackMobileViewContent,
} from "@/lib/meta-events";

type BagSize = 3 | 5 | 10 | 25;

const emptyBags = { kg3: 0, kg5: 0, kg10: 0, kg25: 0 };

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const productsOffsetRef = useRef(0);
  const { addBag, getItem, getTotalItems, removeBag } = useCart();
  const { error, loading, products, refresh, refreshing } = useLiveCatalog();
  const { contents } = useLiveStorefrontContent();
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithImage | null>(null);
  const groupedProducts = useMemo(
    () => groupProductsByCatalogCategory(products),
    [products],
  );
  const selectedCartItem = selectedProduct
    ? getItem(selectedProduct.$id)
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
  const activePromotions = getActiveStorefrontContent(
    contents,
    "mobile",
    "promotion",
  );
  const announcement = getActiveStorefrontContent(
    contents,
    "mobile",
    "announcement",
  )[0];
  const selectedPromotion = selectedProduct
    ? getProductPromotion(contents, selectedProduct.$id, "mobile")
    : undefined;

  const showProducts = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, productsOffsetRef.current - 12),
      animated: true,
    });
  };

  const openProduct = (product: ProductWithImage) => {
    setSelectedProduct(product);
    void trackMobileViewContent({
      contentName: product.name,
      contentId: product.$id,
      value: calculatePrice(product, 5),
    });
  };
  const closeProduct = () => {
    setSelectedProduct(null);
  };
  const handleAddBag = (bagSize: BagSize) => {
    if (!selectedProduct?.available) return;
    addBag(selectedProduct, bagSize);
    void trackMobileAddToCart({
      contentName: selectedProduct.name,
      contentId: selectedProduct.$id,
      value: calculatePrice(selectedProduct, bagSize),
      quantity: 1,
    });
  };
  const handleRemoveBag = (bagSize: BagSize) => {
    if (selectedProduct) removeBag(selectedProduct.$id, bagSize);
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
        contentContainerClassName="bg-white pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh("manual")}
            tintColor="#27247B"
          />
        }
      >
        <StorefrontAnnouncement
          announcement={announcement}
          onOrderNow={() => {
            const product = products.find(
              (candidate) => candidate.$id === announcement?.product_id,
            );
            if (product) openProduct(product);
            else showProducts();
          }}
        />
        <StorefrontHeader
          cartCount={getTotalItems()}
          onActionPress={() => router.push("/explore")}
        />

        <MobilePromotionRail
          onPress={openProduct}
          products={products}
          promotions={activePromotions}
          width={width}
        />

        <View
          className="px-4 pb-6 pt-12"
          onLayout={(event) => {
            productsOffsetRef.current = event.nativeEvent.layout.y;
          }}
        >
          <View className="mb-12 items-center">
            <Text className="text-center text-[34px] font-extrabold leading-[40px] text-brand-800">
              Our Products
            </Text>
            <View className="mt-3 h-1.5 w-44 rounded-full bg-gold-400" />
            <Text className="mt-5 max-w-[330px] text-center text-[16px] leading-6 text-gray-600">
              Choose your preferred quantity for the best pricing. All products
              come with our quality guarantee.
            </Text>
          </View>

          {loading && products.length === 0 && (
            <View className="mb-10 gap-4">
              {[0, 1].map((item) => (
                <View
                  key={item}
                  className="overflow-hidden rounded-card border border-gray-200 bg-white"
                >
                  <View className="h-80 bg-gray-100" />
                  <View className="gap-3 p-4">
                    <View className="h-5 w-4/5 rounded bg-gray-100" />
                    <View className="h-4 w-full rounded bg-gray-100" />
                    <View className="h-11 rounded-full bg-gray-200" />
                  </View>
                </View>
              ))}
            </View>
          )}

          {error && (
            <View className="mb-8 gap-2 rounded-card border border-coral-100 bg-coral-50 p-4">
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

          {groupedProducts.map(({ category, products: categoryProducts }) => (
            <ProductSection
              key={category}
              title={category}
              products={categoryProducts}
              onPress={openProduct}
              promotions={activePromotions}
            />
          ))}

          {!loading && products.length === 0 && !error && (
            <View className="items-center gap-3 rounded-card border border-gray-200 bg-white px-5 py-12">
              <Text className="text-[48px]">🌾</Text>
              <Text className="text-[20px] font-extrabold text-brand-800">
                No Products Available
              </Text>
              <Text className="text-center text-[14px] leading-5 text-gray-600">
                Check back soon for our premium rice selection.
              </Text>
            </View>
          )}
        </View>

        <View className="bg-brand-800 px-5 py-7">
          <Text className="text-[22px] font-extrabold text-white">
            Yousuf Rice
          </Text>
          <Text className="mt-1 text-[12px] font-semibold text-brand-200">
            © Yousuf Rice | A Brand of SS International
          </Text>
          <Text className="mt-3 max-w-[330px] text-[13px] leading-5 text-white/80">
            Premium quality rice delivered to your doorstep across Karachi.
          </Text>
        </View>
      </AppScrollView>

      <ProductSelectionModal
        bagCounts={bagCounts}
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
        promotion={selectedPromotion}
        totalKg={totalKg}
        totalPrice={totalPrice}
        visible={Boolean(selectedProduct)}
      />
    </>
  );
}

function MobilePromotionRail({
  onPress,
  products,
  promotions,
  width,
}: {
  onPress: (product: ProductWithImage) => void;
  products: ProductWithImage[];
  promotions: StorefrontContent[];
  width: number;
}) {
  if (promotions.length === 0) return null;
  const themeColors = {
    harvest: { background: "#f3ead3", foreground: "#302615", accent: "#6e4d22" },
    midnight: { background: "#27247b", foreground: "#ffffff", accent: "#ffff03" },
    saffron: { background: "#fff5cb", foreground: "#3b2a00", accent: "#27247b" },
    emerald: { background: "#e5f2e9", foreground: "#123c2b", accent: "#176345" },
    rose: { background: "#f9e7e6", foreground: "#542624", accent: "#8e3f3a" },
  };
  const cardWidth = Math.max(290, width - 44);

  return (
    <View className="pb-2 pt-6">
      <View className="mb-4 px-4">
        <Text className="text-[10px] font-black uppercase tracking-[2px] text-amber-700">
          On the rice counter
        </Text>
        <Text className="mt-1 text-[30px] font-black leading-9 text-brand-800">
          Current offers
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        contentContainerClassName="gap-3 px-4 pb-5"
      >
        {promotions.map((promotion) => {
          const product = products.find(
            (candidate) => candidate.$id === promotion.product_id,
          );
          const colors = themeColors[promotion.theme];
          const isMidnight = promotion.theme === "midnight";
          return (
            <Pressable
              accessibilityRole="button"
              disabled={!product}
              key={promotion.$id}
              onPress={() => product && onPress(product)}
              className="relative min-h-[238px] overflow-hidden rounded-[28px] border border-black/10 p-5 active:opacity-90"
              style={{
                backgroundColor: colors.background,
                width: cardWidth,
                shadowColor: "#27247b",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.14,
                shadowRadius: 18,
                elevation: 5,
              }}
            >
              <View className="absolute -right-12 -top-16 h-48 w-48 rounded-full border border-black/10" />
              <View className="flex-1 flex-row gap-3">
                <View className="flex-1 items-start">
                  <Text
                    className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[1.4px]"
                    style={{
                      backgroundColor: colors.accent,
                      color: isMidnight ? "#27247b" : "#ffffff",
                    }}
                  >
                    {promotion.badge_text || "Current offer"}
                  </Text>
                  <Text
                    className="mt-4 text-[28px] font-black leading-[29px]"
                    style={{ color: colors.foreground }}
                  >
                    {promotion.title}
                  </Text>
                  {!!promotion.description && (
                    <Text
                      className="mt-3 text-[13px] font-semibold leading-5 opacity-75"
                      style={{ color: colors.foreground }}
                    >
                      {promotion.description}
                    </Text>
                  )}
                  <Text
                    className="mt-5 rounded-full px-4 py-2 text-[12px] font-black"
                    style={{
                      backgroundColor: colors.accent,
                      color: isMidnight ? "#27247b" : "#ffffff",
                    }}
                  >
                    {promotion.cta_text || "View offer"} →
                  </Text>
                </View>
                {promotion.visual_style !== "minimal" && product?.imageUrl && (
                  <View className="w-[34%] justify-end">
                    <Image
                      source={{ uri: product.imageUrl }}
                      contentFit="contain"
                      className="h-[190px] w-full"
                    />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ProductSection({
  onPress,
  products,
  promotions,
  title,
}: {
  onPress: (product: ProductWithImage) => void;
  products: ProductWithImage[];
  promotions: StorefrontContent[];
  title: string;
}) {
  return (
    <View className="mb-14 gap-6">
      <View className="flex-row items-center gap-3">
        <View className="h-0.5 flex-1 bg-gold-400" />
        <Text className="max-w-[250px] text-center text-[23px] font-extrabold leading-7 text-brand-800">
          {title}
        </Text>
        <View className="h-0.5 flex-1 bg-gold-400" />
      </View>
      <View className="gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.$id}
            product={product}
            badgeLabel={
              promotions.find(
                (promotion) => promotion.product_id === product.$id,
              )?.badge_text || undefined
            }
            onPress={() => onPress(product)}
          />
        ))}
      </View>
    </View>
  );
}

function ProductCard({
  badgeLabel,
  imageUrl,
  onPress,
  product,
}: {
  badgeLabel?: string;
  imageUrl?: string;
  onPress: () => void;
  product: ProductWithImage;
}) {
  const source = imageUrl ?? product.imageUrl;
  const tenKgDiscountPrice =
    product.has_tier_pricing &&
    product.tier_10kg_up_price &&
    product.tier_10kg_up_price > 0
      ? product.tier_10kg_up_price
      : null;
  const hasTenKgDiscount =
    tenKgDiscountPrice !== null &&
    tenKgDiscountPrice < product.base_price_per_kg;
  const tenKgSavings = hasTenKgDiscount
    ? (product.base_price_per_kg - tenKgDiscountPrice) * 10
    : 0;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!product.available}
      onPress={onPress}
      className="w-full overflow-hidden rounded-card border border-gray-200 bg-white active:opacity-85"
      style={{
        elevation: 3,
        shadowColor: "#111827",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      }}
    >
      <View className="relative h-80 overflow-hidden bg-wash">
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
          <View
            className="absolute items-center bg-orange-500 py-2"
            style={{
              right: -52,
              top: 24,
              transform: [{ rotate: "45deg" }],
              width: 190,
            }}
          >
            <Text className="text-[11px] font-black uppercase tracking-[1px] text-white">
              🎁 {badgeLabel}
            </Text>
          </View>
        )}
      </View>
      <View className="p-4">
        <Text className="text-[18px] font-extrabold leading-6 text-brand-800">
          {product.name}
        </Text>
        {!!product.description && (
          <Text
            numberOfLines={3}
            className="mt-2 text-[14px] leading-5 text-gray-600"
          >
            {product.description}
          </Text>
        )}

        {tenKgDiscountPrice && (
          <View className="mt-4 rounded-lg border border-gold-400 bg-gold-50 p-3">
            <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-brand-700">
              10kg discounted price
            </Text>
            <View className="mt-1 flex-row flex-wrap items-baseline gap-2">
              <Text className="text-[23px] font-black text-brand-800">
                {formatCurrency(tenKgDiscountPrice)}
              </Text>
              <Text className="text-[12px] font-bold text-brand-700">/kg</Text>
              {hasTenKgDiscount && (
                <Text className="text-[12px] font-semibold text-gray-500 line-through">
                  {formatCurrency(product.base_price_per_kg)}/kg
                </Text>
              )}
            </View>
            {hasTenKgDiscount && (
              <View className="mt-2 border-t border-brand-800/10 pt-2">
                <Text className="text-[12px] font-extrabold leading-4 text-brand-800">
                  Same quality rice, save {formatCurrency(tenKgSavings)} on every
                  10kg order
                </Text>
              </View>
            )}
          </View>
        )}

        <View className="mt-4 border-t border-gray-200 pt-4">
          <View className="min-h-11 flex-row items-center justify-center rounded-full bg-brand-800 px-4">
            <Text className="text-[14px] font-extrabold text-white">
              Order Now
            </Text>
            <Text className="ml-2 text-[18px] font-bold text-white">›</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ProductSelectionModal({
  bagCounts,
  onAddBag,
  onBuyNow,
  onClose,
  onRemoveBag,
  onShare,
  pricePerKg,
  product,
  promotion,
  totalKg,
  totalPrice,
  visible,
}: {
  bagCounts: typeof emptyBags;
  onAddBag: (bagSize: BagSize) => void;
  onBuyNow: () => void;
  onClose: () => void;
  onRemoveBag: (bagSize: BagSize) => void;
  onShare: () => void;
  pricePerKg: number;
  product: ProductWithImage | null;
  promotion?: StorefrontContent;
  totalKg: number;
  totalPrice: number;
  visible: boolean;
}) {
  if (!product) return null;
  const qualifyingBagSize = promotion?.qualifying_bag_size_kg;
  const rewardTagFor = (bagSize: BagSize, fallback?: string) =>
    qualifyingBagSize === bagSize && promotion?.reward_text
      ? `+ ${promotion.reward_text} FREE`
      : fallback;
  const bagRows = (
    [
      {
        label: "3kg bag",
        tag: rewardTagFor(3),
        size: 3,
        value: bagCounts.kg3,
      },
      {
        label: "5kg bag",
        tag: rewardTagFor(5, "Popular"),
        size: 5,
        value: bagCounts.kg5,
      },
      {
        label: "10kg bag",
        tag: rewardTagFor(10, "Great deal"),
        size: 10,
        value: bagCounts.kg10,
      },
      {
        label: "25kg bag",
        tag: rewardTagFor(25, "Best value"),
        size: 25,
        value: bagCounts.kg25,
      },
    ] satisfies {
      label: string;
      size: BagSize;
      tag?: string;
      value: number;
    }[]
  ).filter((row) => row.size !== 3 || !shouldHideThreeKgBag(product));
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
                  source={{ uri: product.imageUrl }}
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
              {promotion && (
                <Text className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-[13px] font-bold leading-5 text-brand-800">
                  {promotion.description || promotion.title}
                  {promotion.reward_text && qualifyingBagSize
                    ? ` Only ${qualifyingBagSize}kg bags qualify for ${promotion.reward_text}.`
                    : ""}
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
