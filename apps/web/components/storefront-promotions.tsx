"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product, StorefrontContent } from "@repo/types";
import { formatCurrency, getActiveStorefrontContent } from "@repo/utils";
import { ArrowUpRight, Gift, Wheat } from "lucide-react";
import { STORAGE_BUCKET_ID } from "@/lib/appwrite";
import { useStorefrontContent } from "@/components/storefront-content-provider";

const themeClasses = {
  harvest: "bg-[#f3ead3] text-[#302615] border-[#d8be7b]",
  midnight: "bg-[#27247b] text-white border-[#4641a3]",
  saffron: "bg-[#fff5cb] text-[#3b2a00] border-[#e8b423]",
  emerald: "bg-[#e5f2e9] text-[#123c2b] border-[#80b795]",
  rose: "bg-[#f9e7e6] text-[#542624] border-[#d69a96]",
} satisfies Record<StorefrontContent["theme"], string>;

const accentClasses = {
  harvest: "bg-[#6e4d22] text-white",
  midnight: "bg-[#ffff03] text-[#27247b]",
  saffron: "bg-[#27247b] text-white",
  emerald: "bg-[#176345] text-white",
  rose: "bg-[#8e3f3a] text-white",
} satisfies Record<StorefrontContent["theme"], string>;

function productImageUrl(fileId?: string) {
  if (!fileId) return null;
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
}

export function PromotionCard({
  imageFileId,
  preview = false,
  product,
  promotion,
}: {
  imageFileId?: string;
  preview?: boolean;
  product?: Product;
  promotion: StorefrontContent;
}) {
  const imageUrl = productImageUrl(imageFileId);
  const href =
    promotion.cta_url ||
    (promotion.product_id ? `/products/${promotion.product_id}` : "#products");
  const productFocused = promotion.visual_style === "product_focus";
  const minimal = promotion.visual_style === "minimal";

  const card = (
    <article
      className={`group relative isolate min-h-[250px] overflow-hidden rounded-[28px] border p-6 shadow-[0_20px_55px_rgba(39,36,123,0.12)] transition-transform duration-300 hover:-translate-y-1 ${themeClasses[promotion.theme]} ${
        minimal ? "md:min-h-[220px]" : ""
      }`}
    >
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-current opacity-[0.08]" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full border border-current opacity-[0.08]" />
      <div
        className={`relative z-10 flex h-full gap-5 ${
          productFocused ? "items-center" : "items-start"
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <div className="mb-5 flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${accentClasses[promotion.theme]}`}>
              {promotion.badge_text || "Current offer"}
            </span>
            {promotion.reward_text && <Gift className="h-4 w-4 opacity-70" />}
          </div>
          <h2 className="max-w-xl text-balance text-3xl font-black leading-[0.98] tracking-[-0.035em] sm:text-4xl">
            {promotion.title}
          </h2>
          {promotion.description && (
            <p className="mt-4 max-w-xl text-sm font-medium leading-6 opacity-80 sm:text-base">
              {promotion.description}
            </p>
          )}
          {product && promotion.show_product_price && (
            <p className="mt-4 text-sm font-black">
              {formatCurrency(product.base_price_per_kg)}/kg
            </p>
          )}
          <span className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${accentClasses[promotion.theme]}`}>
            {promotion.cta_text || "View offer"}
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        {!minimal && (
          <div className="relative hidden h-[210px] w-[38%] shrink-0 items-end justify-center sm:flex">
            <div className="absolute bottom-2 h-8 w-4/5 rounded-[50%] bg-black/20 blur-xl" />
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product?.name || promotion.title}
                fill
                className="object-contain drop-shadow-[0_18px_16px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-1"
                sizes="(max-width: 768px) 0px, 320px"
              />
            ) : (
              <Wheat className="h-28 w-28 opacity-25" />
            )}
          </div>
        )}
      </div>
    </article>
  );

  return preview ? card : <Link href={href}>{card}</Link>;
}

export default function StorefrontPromotions() {
  const { contents, imageFileIds, products } = useStorefrontContent();
  const promotions = getActiveStorefrontContent(
    contents,
    "web",
    "promotion",
  );

  if (promotions.length === 0) return null;

  return (
    <section aria-labelledby="current-offers" className="container mx-auto px-4 pb-4 pt-8 sm:pt-10">
      <div className="mb-5 flex items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a06b00]">
            On the rice counter
          </p>
          <h1 id="current-offers" className="mt-1 text-3xl font-black tracking-[-0.035em] text-[#27247b] sm:text-4xl">
            Current offers
          </h1>
        </div>
        <p className="hidden max-w-sm text-right text-sm font-medium leading-5 text-gray-500 md:block">
          Each offer is separate, product-specific, and updated live by the Yousuf Rice team.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {promotions.map((promotion) => {
          const product = products.find(
            (candidate) => candidate.$id === promotion.product_id,
          );
          return (
            <PromotionCard
              imageFileId={
                promotion.product_id
                  ? imageFileIds.get(promotion.product_id)
                  : undefined
              }
              key={promotion.$id}
              product={product}
              promotion={promotion}
            />
          );
        })}
      </div>
    </section>
  );
}
