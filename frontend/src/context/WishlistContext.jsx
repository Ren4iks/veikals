import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const WishCtx = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [ids, setIds] = useState([]);
  const [items, setItems] = useState([]);

  const refresh = useCallback(async () => {
    if (!user || user === false) {
      setIds([]);
      setItems([]);
      return;
    }
    try {
      const { data } = await api.get("/wishlist");
      setItems(data.items);
      setIds(data.items.map((p) => p.id));
    } catch {
      setIds([]);
      setItems([]);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (product_id) => {
    const { data } = await api.post("/wishlist/toggle", { product_id });
    setIds((cur) => data.in_wishlist ? [...cur, product_id] : cur.filter((x) => x !== product_id));
    refresh();
    return data;
  };

  return (
    <WishCtx.Provider value={{ ids, items, toggle, refresh, has: (id) => ids.includes(id) }}>
      {children}
    </WishCtx.Provider>
  );
};

export const useWishlist = () => useContext(WishCtx);
