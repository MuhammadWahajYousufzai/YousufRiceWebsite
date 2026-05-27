import { Suspense } from 'react';
import { AsyncSpecialDeals } from '@/components/async-special-deals';
import { SpecialDealsSkeleton } from '@/components/loading-skeletons';

/**
 * Special Deals Page with Partial Prerendering (PPR)
 * 
 * Static Shell:
 * - Page structure and layout
 * - Navigation and footer (from layout)
 * 
 * Dynamic Content (Suspense boundaries):
 * - Special deals products (streamed)
 * 
 * Benefits:
 * - Instant static shell (<100ms)
 * - Progressive content streaming
 * - Optimal SEO with immediate content
 * - Better UX with loading states
 */
export default function SpecialDealsPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <section className="container mx-auto px-4 py-16">
        <Suspense fallback={<SpecialDealsSkeleton count={3} />}>
          <AsyncSpecialDeals />
        </Suspense>
      </section>
    </div>
  );
}
