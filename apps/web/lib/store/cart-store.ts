import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Product } from "../types";
import { calculatePrice } from "../utils";

type BagSize = 3 | 5 | 10 | 25;

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity: number, isColdDrinkBundle?: boolean) => void;
  addBag: (product: Product, bagSize: BagSize, isColdDrinkBundle?: boolean) => void;
  removeBag: (productId: string, bagSize: BagSize, isColdDrinkBundle?: boolean) => void;
  removeItem: (productId: string, isColdDrinkBundle?: boolean) => void;
  updateQuantity: (productId: string, quantity: number, isColdDrinkBundle?: boolean) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isHighlighted: boolean;
  highlightCart: () => void;
}

// Helper function to ensure cart items have bags structure
const migrateLegacyCartItem = (item: any): CartItem => {
  if (!item.bags) {
    // Legacy item without bags - convert quantity to bags
    return {
      ...item,
      bags: { kg3: 0, kg5: 0, kg10: 0, kg25: 0 },
    };
  }
  return item as CartItem;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      isHighlighted: false,
      highlightCart: () => {
        set({ isHighlighted: true });
        setTimeout(() => set({ isHighlighted: false }), 1000);
      },

      addItem: (product, quantity, isColdDrinkBundle = false) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.$id === product.$id && !!item.isColdDrinkBundle === isColdDrinkBundle
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.$id === product.$id && !!item.isColdDrinkBundle === isColdDrinkBundle
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                product,
                quantity,
                bags: { kg3: 0, kg5: 0, kg10: 0, kg25: 0 },
                isColdDrinkBundle,
              },
            ],
          };
        });
      },

      addBag: (product, bagSize, isColdDrinkBundle = false) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.$id === product.$id && !!item.isColdDrinkBundle === isColdDrinkBundle
          );

          if (existingItem) {
            const newBags = { ...existingItem.bags };
            const bagKey = `kg${bagSize}` as keyof typeof newBags;
            newBags[bagKey] += 1;

            const newQuantity =
              newBags.kg3 * 3 +
              newBags.kg5 * 5 +
              newBags.kg10 * 10 +
              newBags.kg25 * 25;

            return {
              items: state.items.map((item) =>
                item.product.$id === product.$id && !!item.isColdDrinkBundle === isColdDrinkBundle
                  ? { ...item, bags: newBags, quantity: newQuantity }
                  : item
              ),
            };
          }

          const bags = { kg3: 0, kg5: 0, kg10: 0, kg25: 0 };
          const bagKey = `kg${bagSize}` as keyof typeof bags;
          bags[bagKey] = 1;

          return {
            items: [
              ...state.items,
              {
                product,
                quantity: bagSize,
                bags,
                isColdDrinkBundle,
              },
            ],
          };
        });
      },

      removeBag: (productId, bagSize, isColdDrinkBundle = false) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.$id === productId && !!item.isColdDrinkBundle === isColdDrinkBundle
          );

          if (!existingItem) return state;

          const newBags = { ...existingItem.bags };
          const bagKey = `kg${bagSize}` as keyof typeof newBags;

          if (newBags[bagKey] > 0) {
            newBags[bagKey] -= 1;
          }

          const newQuantity =
            newBags.kg3 * 3 +
            newBags.kg5 * 5 +
            newBags.kg10 * 10 +
            newBags.kg25 * 25;

          // Remove item if no bags left
          if (newQuantity === 0) {
            return {
              items: state.items.filter(
                (item) => !(item.product.$id === productId && !!item.isColdDrinkBundle === isColdDrinkBundle)
              ),
            };
          }

          return {
            items: state.items.map((item) =>
              item.product.$id === productId && !!item.isColdDrinkBundle === isColdDrinkBundle
                ? { ...item, bags: newBags, quantity: newQuantity }
                : item
            ),
          };
        });
      },

      removeItem: (productId, isColdDrinkBundle = false) => {
        set((state) => ({
          items: state.items.filter((item) => !(item.product.$id === productId && !!item.isColdDrinkBundle === isColdDrinkBundle)),
        }));
      },

      updateQuantity: (productId, quantity, isColdDrinkBundle = false) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product.$id === productId && !!item.isColdDrinkBundle === isColdDrinkBundle ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          return total + calculatePrice(item.product, item.quantity);
        }, 0);
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          // Sum up all the bags (3kg, 5kg, 10kg, 25kg)
          const totalBags = Object.values(item.bags || {}).reduce(
            (sum, count) => sum + count,
            0
          );
          return total + totalBags;
        }, 0);
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items } as CartStore),
      onRehydrateStorage: () => (state) => {
        // Migrate legacy cart items when loading from storage
        if (state?.items) {
          state.items = state.items.map(migrateLegacyCartItem);
        }
      },
    }
  )
);
