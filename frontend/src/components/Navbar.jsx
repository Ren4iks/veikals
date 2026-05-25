import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, User, SignOut, MagnifyingGlass, Heart, List, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { ids: wishIds } = useWishlist();
  const navigate = useNavigate();
  const loc = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const onSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  const linkCls = (path) =>
    `text-sm uppercase tracking-[0.18em] font-medium transition-colors ${
      loc.pathname === path ? "text-black" : "text-neutral-500 hover:text-black"
    }`;

  return (
    <header className="glass-header sticky top-0 z-40" data-testid="main-navbar">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="font-display text-2xl font-black tracking-tighter flex-shrink-0" data-testid="logo-link">
          VEIKALS<span className="text-red-500">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
          <Link to="/" className={linkCls("/")} data-testid="nav-home">Sākums</Link>
          <Link to="/shop" className={linkCls("/shop")} data-testid="nav-shop">Veikals</Link>
          <Link to="/shop?category=elektronika" className="text-sm uppercase tracking-[0.18em] font-medium text-neutral-500 hover:text-black hidden lg:block" data-testid="nav-electronics">Elektronika</Link>
          <Link to="/shop?category=apgerbs" className="text-sm uppercase tracking-[0.18em] font-medium text-neutral-500 hover:text-black hidden lg:block" data-testid="nav-clothing">Apģērbs</Link>
          <Link to="/shop?category=smarzas" className="text-sm uppercase tracking-[0.18em] font-medium text-neutral-500 hover:text-black hidden lg:block" data-testid="nav-perfumes">Smaržas</Link>
        </nav>
        <div className="flex items-center gap-4 sm:gap-5">
          <button onClick={() => setSearchOpen(true)} className="hover:opacity-70" data-testid="search-open-btn" aria-label="Search">
            <MagnifyingGlass size={20} weight="duotone" />
          </button>
          {user && user !== false ? (
            <>
              {user.role === "admin" && (
                <Link to="/admin" className="text-xs uppercase tracking-wider font-medium hidden lg:inline" data-testid="nav-admin">
                  Admin
                </Link>
              )}
              <Link to="/wishlist" className="relative hover:opacity-70 hidden sm:inline" data-testid="nav-wishlist">
                <Heart size={20} weight="duotone" />
                {wishIds.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {wishIds.length}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="hover:opacity-70" data-testid="nav-profile">
                <User size={20} weight="duotone" />
              </Link>
              <button onClick={() => { logout(); navigate("/"); }} className="hover:opacity-70 hidden sm:inline" data-testid="nav-logout-btn" title="Iziet">
                <SignOut size={20} weight="duotone" />
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm uppercase tracking-[0.18em] font-medium hover:opacity-70" data-testid="nav-login">
              Pieslēgties
            </Link>
          )}
          <Link to="/cart" className="relative hover:opacity-70" data-testid="nav-cart">
            <ShoppingBag size={22} weight="duotone" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center" data-testid="cart-count">
                {itemCount}
              </span>
            )}
          </Link>
          <button onClick={() => setMobileOpen(true)} className="md:hidden hover:opacity-70" data-testid="mobile-menu-open">
            <List size={22} weight="duotone" />
          </button>
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-0 bg-white border-b border-black/10 shadow-lg" data-testid="search-overlay">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center gap-3">
            <MagnifyingGlass size={20} weight="duotone" className="text-neutral-400 flex-shrink-0" />
            <form onSubmit={onSearch} className="flex-1">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Meklē produktus... (piem. iPhone, hoodie, smaržas)"
                className="w-full bg-transparent outline-none text-base"
                data-testid="search-input"
              />
            </form>
            <button onClick={() => setSearchOpen(false)} data-testid="search-close-btn"><X size={20} weight="bold" /></button>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="bg-white w-72 ml-auto h-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-8">
              <button onClick={() => setMobileOpen(false)}><X size={22} weight="bold" /></button>
            </div>
            <nav className="flex flex-col gap-5">
              <Link to="/" onClick={() => setMobileOpen(false)} className="text-lg font-display font-bold">Sākums</Link>
              <Link to="/shop" onClick={() => setMobileOpen(false)} className="text-lg font-display font-bold">Veikals</Link>
              <Link to="/shop?category=elektronika" onClick={() => setMobileOpen(false)} className="text-base">Elektronika</Link>
              <Link to="/shop?category=apgerbs" onClick={() => setMobileOpen(false)} className="text-base">Apģērbs</Link>
              <Link to="/shop?category=smarzas" onClick={() => setMobileOpen(false)} className="text-base">Smaržas</Link>
              <Link to="/track" onClick={() => setMobileOpen(false)} className="text-base">Sekot pasūtījumam</Link>
              {user && user !== false && <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="text-base">Vēlmju saraksts</Link>}
              {user?.role === "admin" && <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-base">Admin</Link>}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
