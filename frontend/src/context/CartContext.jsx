import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CartCtx = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user === false) {
      setCart({ items: [], total: 0 });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/cart");
      setCart(data);
    } catch {
      setCart({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = async (product_id, quantity = 1) => {
    await api.post("/cart/add", { product_id, quantity });
    await refresh();
  };
  const update = async (product_id, quantity) => {
    await api.put("/cart/update", { product_id, quantity });
    await refresh();
  };
  const remove = async (product_id) => {
    await api.delete(`/cart/${product_id}`);
    await refresh();
  };
  const clear = async () => {
    await api.delete(`/cart`);
    await refresh();
  };

  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartCtx.Provider value={{ cart, loading, add, update, remove, clear, refresh, itemCount }}>
      {children}
    </CartCtx.Provider>
  );
};

export const useCart = () => useContext(CartCtx);
