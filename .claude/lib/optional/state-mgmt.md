# Optional Skill: State Management (Zustand)

## Activate when
Spec mentions: cart, wishlist, multi-step form, wizard,
complex UI state shared across many components

## Stack Addition
  npm install zustand

## When to use Zustand vs TanStack Query
  TanStack Query → server state (data from API, cached, synced)
  Zustand        → client UI state (cart, UI toggles, wizard steps)
  Rule: if it comes from the server, use TanStack Query
        if it only lives in the browser, use Zustand

## Store Location
  All stores: /src/lib/store/[name].ts
  One store per domain: cart.ts, ui.ts, wizard.ts

## Store Pattern (with persistence)
  ```typescript
  import { create } from 'zustand'
  import { persist } from 'zustand/middleware'

  type CartItem = {
    id: string
    name: string
    price: number
    quantity: number
    image_url?: string
  }

  type CartStore = {
    items: CartItem[]
    add: (item: Omit<CartItem, 'quantity'>) => void
    remove: (id: string) => void
    update: (id: string, quantity: number) => void
    clear: () => void
    total: () => number
    count: () => number
  }

  export const useCart = create<CartStore>()(
    persist(
      (set, get) => ({
        items: [],
        add: (item) => set((state) => {
          const existing = state.items.find(i => i.id === item.id)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              )
            }
          }
          return { items: [...state.items, { ...item, quantity: 1 }] }
        }),
        remove: (id) => set(state => ({
          items: state.items.filter(i => i.id !== id)
        })),
        update: (id, quantity) => set(state => ({
          items: quantity === 0
            ? state.items.filter(i => i.id !== id)
            : state.items.map(i => i.id === id ? { ...i, quantity } : i)
        })),
        clear: () => set({ items: [] }),
        total: () => get().items.reduce(
          (sum, item) => sum + item.price * item.quantity, 0
        ),
        count: () => get().items.reduce(
          (sum, item) => sum + item.quantity, 0
        ),
      }),
      { name: 'cart-storage' }
    )
  )
  ```

## Rules
  ✅ Use persist middleware for cart-like stores (survives page refresh)
  ✅ Keep stores small and focused (one concern per store)
  ✅ Compute derived values (total, count) as functions not state
  ❌ Never store sensitive data in Zustand (persists to localStorage)
  ❌ Never store auth tokens in Zustand
  ❌ Never use Zustand for server data (use TanStack Query)
