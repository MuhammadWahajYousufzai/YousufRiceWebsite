import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { Card, CardContent } from "./ui/card";
import { STORAGE_BUCKET_ID } from "@/lib/appwrite";

interface ProductCardSimpleProps {
  product: Product;
  imageFileId?: string;
  badgeLabel?: string;
}

export function ProductCard({ product, imageFileId, badgeLabel }: ProductCardSimpleProps) {
  const imageUrl = imageFileId
    ? `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${imageFileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
    : null;

  return (
    <Link href={`/products/${product.$id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#ffff03] bg-white group h-full cursor-pointer">
        <div className="flex flex-col h-full">
          {/* Image Section */}
          <div className="relative w-full h-80 md:h-96 bg-linear-to-br from-[#27247b]/5 to-[#ffff03]/10 group-hover:from-[#27247b]/20 group-hover:to-[#ffff03]/30 transition-all duration-500 overflow-hidden">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-10"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                quality={85}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-2 animate-pulse">🌾</div>
                  <p className="text-xs text-gray-600 font-medium">No Image</p>
                </div>
              </div>
            )}
            {!product.available && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm">
                <span className="text-white font-bold text-sm bg-red-600 px-4 py-2 rounded-full">
                  Out of Stock
                </span>
              </div>
            )}
            {product.available &&
              process.env.NEXT_PUBLIC_ENABLE_RAMADAN_OFFER === "true" && (
                <div className="absolute top-2 left-2 z-10">
                  <span className="bg-[#ffff03] text-[#27247b] text-[10px] md:text-xs font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
                    <span>⏳</span> Post-Eid Special (Ends April 25)
                  </span>
                </div>
              )}
            {badgeLabel && (
              <div className="absolute top-0 right-0 z-20 overflow-hidden w-44 h-44">
                <div className="absolute transform rotate-45 bg-linear-to-r from-amber-400 to-orange-500 text-white font-black text-center py-2 -right-12.5 top-6 w-52 shadow-[0_4px_15px_rgba(245,158,11,0.3)] border-b-2 border-amber-200 tracking-widest text-sm flex items-center justify-center gap-1 animate-[pulse_3s_ease-in-out_infinite]">
                  <span className="inline-block shrink-0">🥤</span>
                  <span className="shrink-0">{badgeLabel}</span>
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <CardContent className="p-4 flex flex-col flex-1">
            {/* Product Name */}
            <h3 className="text-base md:text-lg font-bold text-[#27247b] mb-2 group-hover:text-[#27247b]/80 transition-colors line-clamp-2">
              {product.name}
            </h3>

            {/* Product Description */}
            {product.description && (
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed line-clamp-3 flex-1">
                {product.description}
              </p>
            )}

            {/* Order Now Button */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="w-full bg-[#27247b] text-white group-hover:bg-[#ffff03] group-hover:text-[#27247b] text-sm font-bold px-4 py-2.5 rounded-full shadow-md flex items-center justify-center gap-2 transition-all duration-300">
                Order Now
                <svg
                  className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
