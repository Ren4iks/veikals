import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, User, SignOut, MagnifyingGlass } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const loc = useLocation();

  const linkCls = (path) =>
    `text-sm uppercase tracking-[0.18em] font-medium transition-colors ${
      loc.pathname === path ? "text-black" : "text-neutral-500 hover:text-black"
    }`;

  return (
    <header className="glass-header sticky top-0 z-40" data-testid="main-navbar">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl font-black tracking-tighter" data-testid="logo-link">
          VEIKALS<span className="text-red-500">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-10">
          <Link to="/" className={linkCls("/")} data-testid="nav-home">Sākums</Link>
          <Link to="/shop" className={linkCls("/shop")} data-testid="nav-shop">Veikals</Link>
          <Link to="/shop?category=elektronika" className="text-sm uppercase tracking-[0.18em] font-medium text-neutral-500 hover:text-black transition-colors" data-testid="nav-electronics">Elektronika</Link>
          <Link to="/shop?category=apgerbs" className="text-sm uppercase tracking-[0.18em] font-medium text-neutral-500 hover:text-black transition-colors" data-testid="nav-clothing">Apģērbs</Link>
          <Link to="/shop?category=smarzas" className="text-sm uppercase tracking-[0.18em] font-medium text-neutral-500 hover:text-black transition-colors" data-testid="nav-perfumes">Smaržas</Link>
        </nav>
        <div className="flex items-center gap-5">
          {user && user !== false ? (
            <>
              {user.role === "admin" && (
                <Link to="/admin" className="text-xs uppercase tracking-wider font-medium hidden lg:inline" data-testid="nav-admin">
                  Admin
                </Link>
              )}
              <Link to="/profile" className="hover:opacity-70" data-testid="nav-profile">
                <User size={20} weight="duotone" />
              </Link>
              <button onClick={() => { logout(); navigate("/"); }} className="hover:opacity-70" data-testid="nav-logout-btn" title="Iziet">
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
        </div>
      </div>
    </header>
  );
}
