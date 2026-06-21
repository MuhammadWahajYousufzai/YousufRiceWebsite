import type { CartItem, Product } from "@repo/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculatePrice, calculateQuantityFromBags } from "@repo/utils";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { selectionFeedback } from "@/lib/native-feedback";

type BagSize = 3 | 5 | 10 | 25;
type BagKey = keyof CartItem["bags"];

interface CartContextValue {
  addBag: (product: Product, bagSize: BagSize, isColdDrinkBundle?: boolean) => void;
  clearCart: () => void;
  getItem: (productId: string, isColdDrinkBundle?: boolean) => CartItem | undefined;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  items: CartItem[];
  removeBag: (productId: string, bagSize: BagSize, isColdDrinkBundle?: boolean) => void;
  removeItem: (productId: string, isColdDrinkBundle?: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = "@yousuf-rice/mobile-cart-v1";

const emptyBags = (): CartItem["bags"] => ({
  kg3: 0,
  kg5: 0,
  kg10: 0,
  kg25: 0,
});

const bagKeyForSize = (bagSize: BagSize): BagKey => `kg${bagSize}` as BagKey;

const sameLine = (item: CartItem, productId: string, isColdDrinkBundle = false) =>
  item.product.$id === productId && Boolean(item.isColdDrinkBundle) === isColdDrinkBundle;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((saved) => {
        if (!mounted || !saved) return;
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      })
      .catch(() => undefined)
      .finally(() => {
        hydrated.current = true;
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addBag = useCallback(
    (product: Product, bagSize: BagSize, isColdDrinkBundle = false) => {
      void selectionFeedback();
      setItems((current) => {
        const bagKey = bagKeyForSize(bagSize);
        const existing = current.find((item) => sameLine(item, product.$id, isColdDrinkBundle));

        if (!existing) {
          const bags = emptyBags();
          bags[bagKey] = 1;

          return [
            ...current,
            {
              product,
              quantity: calculateQuantityFromBags(bags),
              bags,
              isColdDrinkBundle,
            },
          ];
        }

        return current.map((item) => {
          if (!sameLine(item, product.$id, isColdDrinkBundle)) {
            return item;
          }

          const bags = { ...item.bags, [bagKey]: item.bags[bagKey] + 1 };
          return {
            ...item,
            product,
            quantity: calculateQuantityFromBags(bags),
            bags,
          };
        });
      });
    },
    [],
  );

  const removeBag = useCallback(
    (productId: string, bagSize: BagSize, isColdDrinkBundle = false) => {
      void selectionFeedback();
      setItems((current) => {
        const bagKey = bagKeyForSize(bagSize);

        return current
          .map((item) => {
            if (!sameLine(item, productId, isColdDrinkBundle)) {
              return item;
            }

            const bags = {
              ...item.bags,
              [bagKey]: Math.max(0, item.bags[bagKey] - 1),
            };

            return {
              ...item,
              quantity: calculateQuantityFromBags(bags),
              bags,
            };
          })
          .filter((item) => item.quantity > 0);
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string, isColdDrinkBundle = false) => {
    setItems((current) => current.filter((item) => !sameLine(item, productId, isColdDrinkBundle)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    void AsyncStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const getItem = useCallback(
    (productId: string, isColdDrinkBundle = false) =>
      items.find((item) => sameLine(item, productId, isColdDrinkBundle)),
    [items],
  );

  const getTotalPrice = useCallback(
    () =>
      items.reduce(
        (total, item) => total + calculatePrice(item.product, item.quantity),
        0,
      ),
    [items],
  );

  const getTotalItems = useCallback(
    () =>
      items.reduce(
        (total, item) =>
          total + Object.values(item.bags).reduce((bagTotal, count) => bagTotal + count, 0),
        0,
      ),
    [items],
  );

  const value = useMemo(
    () => ({
      addBag,
      clearCart,
      getItem,
      getTotalItems,
      getTotalPrice,
      items,
      removeBag,
      removeItem,
    }),
    [addBag, clearCart, getItem, getTotalItems, getTotalPrice, items, removeBag, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
