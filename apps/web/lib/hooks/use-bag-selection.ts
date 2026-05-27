import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/lib/types';
import { useCartStore } from '@/lib/store/cart-store';
import { calculatePrice, getPricePerKg } from '@/lib/utils';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing bag selection logic
 * Shared between ProductCard and ProductDetailClient components
 */
export function useBagSelection(product: Product, isBundle: boolean = false) {
  const items = useCartStore((state) => state.items);
  const addBag = useCartStore((state) => state.addBag);
  const removeBag = useCartStore((state) => state.removeBag);
  const router = useRouter();

  // DERIVE state from cart store instead of local state
  // This ensures we are always in sync with what's actually in the cart (and persisted)
  const cartItem = items.find((item) => item.product.$id === product.$id && !!item.isColdDrinkBundle === isBundle);
  
  const bagCounts = cartItem?.bags || { kg3: 0, kg5: 0, kg10: 0, kg25: 0 };

  // Calculate totals based on the derived bag counts
  const totalKg = bagCounts.kg3 * 3 + bagCounts.kg5 * 5 + bagCounts.kg10 * 10 + bagCounts.kg25 * 25;
  const pricePerKg = getPricePerKg(product, totalKg || 1);
  const totalPrice = calculatePrice(product, totalKg || 0);

  /**
   * Add a bag of specified size to cart
   */
  const handleAddBag = (size: 3 | 5 | 10 | 25) => {
    // We don't need to update local state anymore, the store update will trigger a re-render
    addBag(product, size, isBundle);
    useCartStore.getState().setIsOpen(true);
    useCartStore.getState().highlightCart();
    toast.success(`Added ${size}kg bag of ${product.name} to cart!`);
  };

  /**
   * Remove a bag of specified size from cart
   */
  const handleRemoveBag = (size: 3 | 5 | 10 | 25) => {
    const key = `kg${size}` as keyof typeof bagCounts;
    if (bagCounts[key] > 0) {
      removeBag(product.$id, size, isBundle);
      toast.success(`Removed ${size}kg bag from cart!`);
    }
  };

  /**
   * Add all selected bags to cart (for "Add to Cart" button)
   * Note: logic slightly changes here because items are ALREADY in the cart due to immediate updates.
   * We just notify the user.
   */
  const handleAddToCart = () => {
    if (totalKg === 0) {
      toast.error('Please select at least one bag to add to cart!');
      return;
    }
    
    useCartStore.getState().setIsOpen(true);
    useCartStore.getState().highlightCart();
    // Items are already in the store/local storage because handleAddBag adds them immediately
    // So we just show the success message
    toast.success(`Cart updated: ${totalKg}kg of ${product.name}`, {
      icon: '🛒',
      style: {
        borderRadius: '12px',
        background: '#27247b',
        color: '#ffff03',
        fontWeight: 'bold',
      },
    });
  };

  /**
   * Buy now - proceed directly to checkout
   */
  const handleBuyNow = () => {
    if (totalKg === 0) {
      toast.error('Please select at least one bag to continue!');
      return;
    }
    
    useCartStore.getState().setIsOpen(true);
    useCartStore.getState().highlightCart();
    
    toast.success('Review cart! Proceeding to checkout shortly...', {
      icon: '🚀',
      style: {
        borderRadius: '12px',
        background: '#27247b',
        color: '#ffff03',
        fontWeight: 'bold',
      },
    });

    // Don't delay navigation; send tracking separately (Meta uses sendBeacon/keepalive).
    // Small timeout keeps UI responsive and lets the toast render.
    setTimeout(() => {
      useCartStore.getState().setIsOpen(false);
      useCartStore.getState().highlightCart();
      router.push('/checkout');
    }, 150);
  };

  return {
    bagCounts,
    totalKg,
    pricePerKg,
    totalPrice,
    handleAddBag,
    handleRemoveBag,
    handleAddToCart,
    handleBuyNow,
  };
}
