import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { Card, CardContent } from "./ui/card";
import { STORAGE_BUCKET_ID } from "@/lib/appwrite";
import { formatCurrency, getPricePerKg } from "@/lib/utils";
import { Info } from "lucide-react";

interface ColdDrinkBundleCardProps {
  product: Product;
  imageFileId?: string;
}

export function ColdDrinkBundleCard({
  product,
  imageFileId,
}: ColdDrinkBundleCardProps) {
  const imageUrl = imageFileId
    ? `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${imageFileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
    : null;

  return (
    <Link href={`/products/${product.$id}?bundle=colddrink`}>
      <Card className="overflow-hidden hover:shadow-[0_10px_40px_-5px_rgba(20,184,166,0.25)] transition-all duration-500 border-2 border-teal-500/15 hover:border-teal-500/50 bg-white group h-full cursor-pointer relative shadow-xl transform hover:-translate-y-2">
        {/* Cold Drink Ribbon/Badge */}
        <div className="absolute top-0 right-0 z-20 overflow-hidden w-37.5 h-37.5">
          <div className="absolute transform rotate-45 bg-linear-to-r from-amber-400 to-orange-500 text-white font-black text-center py-2 -right-8.75 top-8 w-42.5 shadow-[0_4px_15px_rgba(245,158,11,0.3)] border-b-2 border-amber-200 tracking-widest text-sm flex items-center justify-center gap-1.5 animate-[pulse_3s_ease-in-out_infinite]">
            <span className="group-hover:animate-bounce inline-block origin-bottom transition-transform group-hover:scale-125">
              🥤
            </span>{" "}
            FREE DRINK
          </div>
        </div>

        <div className="flex flex-col h-full bg-linear-to-br from-white to-teal-50/30 relative">
          {/* Subtle Generic Cold Drink background pattern or color hint */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-teal-100/60 via-transparent to-transparent pointer-events-none group-hover:from-cyan-100/60 transition-colors duration-700"></div>

          {/* Image Section */}
          <div className="relative w-full h-80 md:h-96 transition-all duration-500 overflow-hidden flex items-center justify-center bg-linear-to-b from-transparent to-teal-50/50">
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
              <div className="w-full h-full flex items-center justify-center bg-gray-50/50 rounded-t-xl z-10">
                <div className="text-center">
                  <div className="text-6xl mb-2 animate-pulse">🌾</div>
                </div>
              </div>
            )}
            {/* Gradient Overlay for Text Readability - moved to bottom only */}
            <div className="absolute inset-0 bg-linear-to-t from-teal-900/60 via-transparent to-transparent z-20 pointer-events-none"></div>

            {!product.available && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-30">
                <span className="text-white font-bold text-sm bg-red-600 px-4 py-2 rounded-full shadow-lg">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Float badge for the deal */}
            <div className="absolute bottom-3 left-3 z-20 bg-linear-to-r from-teal-500 to-cyan-600 text-white px-3.5 py-2 rounded-xl shadow-[0_8px_25px_rgba(20,184,166,0.4)] border border-cyan-300/50 flex items-center gap-2 transform group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-400">
              <span className="text-xl animate-pulse delay-75">🧊</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest leading-none mb-1">
                  With Every Bundle
                </span>
                <span className="text-sm font-black leading-none drop-shadow-sm">
                  1 Litre Bottle Free
                </span>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <CardContent className="p-5 flex flex-col flex-1 relative z-10 border-t border-gray-100/50 pt-6">
            {/* Tagline */}
            <div className="mb-2 inline-flex">
              <span className="bg-linear-to-r from-orange-50 to-amber-50 text-orange-700 text-[10px] font-black px-2.5 py-1 rounded shadow-sm uppercase tracking-widest border border-orange-200/60">
                10kg Exclusive
              </span>
            </div>

            {/* Product Name */}
            <h3 className="text-lg md:text-xl font-black text-slate-800 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-teal-600 group-hover:to-cyan-600 transition-all duration-300 line-clamp-2 leading-tight">
              {product.name} + Free Cold Drink
            </h3>

            {/* Deal Explanation */}
            <div className="bg-linear-to-br from-teal-50/60 to-cyan-50/30 rounded-xl p-3 mb-5 mt-auto border border-teal-100/80 shadow-inner group-hover:shadow-[inset_0_2px_10px_rgba(20,184,166,0.1)] group-hover:border-teal-300/60 transition-all duration-500">
              <div className="flex items-start gap-3">
                <div className="bg-linear-to-br from-amber-400 to-orange-500 rounded-full p-1.5 mt-0.5 shadow-md group-hover:shadow-lg transition-shadow">
                  <Info className="w-3.5 h-3.5 text-white shrink-0" />
                </div>
                <p className="text-sm text-slate-700 font-medium leading-snug">
                  Buy a 10kg bag and get a{" "}
                  <strong className="text-teal-800 font-extrabold bg-teal-100/60 px-1 py-0.5 rounded ml-0.5 border border-teal-200/50">
                    1 Litre Cold Drink FREE
                  </strong>
                  . Buy two, get two!
                </p>
              </div>
            </div>

            {/* Price & Action */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">
                  Price / 10kg
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 tracking-tight">
                    {formatCurrency(getPricePerKg(product, 10) * 10)}
                  </span>
                </div>
              </div>
              <div className="bg-linear-to-r from-teal-500 to-cyan-600 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-[0_4px_15px_rgba(20,184,166,0.3)] group-hover:shadow-[0_6px_25px_rgba(20,184,166,0.5)] group-hover:from-cyan-500 group-hover:to-teal-500 transition-all duration-500 flex items-center gap-1.5 group-hover:scale-105 active:scale-95">
                View Deal
                <svg
                  className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300"
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
