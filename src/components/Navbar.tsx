import { Coffee, Settings, Home as HomeIcon, ShoppingBag, User as UserIcon, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();

  const navItems = [
    { to: '/', icon: HomeIcon, label: 'Kezdőlap' },
    { to: '/gepek', icon: ShoppingBag, label: 'Gépek' },
    ...(user ? [{ to: '/ugyfelkapu', icon: UserIcon, label: 'Profil' }] : [{ to: '/login', icon: UserIcon, label: 'Belépés' }]),
    ...(isAdmin ? [{ to: '/admin', icon: Settings, label: 'Admin' }] : []),
  ];

  return (
    <>
      <nav className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-cafe-medium/10 sticky top-0 z-50">
        <NavLink to="/" className="flex items-center gap-2 text-cafe-dark font-bold text-xl">
          <Coffee className="text-cafe-gold" />
          <span>Kávégép Szerviz</span>
          {isAdmin && <span className="bg-cafe-gold/10 text-cafe-gold text-[10px] px-2 py-0.5 rounded-full uppercase ml-2">Admin</span>}
        </NavLink>
        <div className="flex items-center gap-8">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 font-medium transition-colors hover:text-cafe-gold",
                  isActive ? "text-cafe-gold" : "text-cafe-dark/70"
                )
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
          {user && (
             <button onClick={signOut} className="text-cafe-medium/40 hover:text-red-500 transition-colors">
               <LogOut size={20} />
             </button>
          )}
        </div>
      </nav>

      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-cafe-medium/10 sticky top-0 z-50">
        <NavLink to="/" className="flex items-center gap-2 text-cafe-dark font-bold text-lg">
          <Coffee className="text-cafe-gold" />
          <span>Kávégép Szerviz</span>
        </NavLink>
        {user && (
           <button onClick={signOut} className="p-2 text-cafe-medium/40">
             <LogOut size={20} />
           </button>
        )}
      </header>

      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-8 px-8 py-4 bg-cafe-dark text-cafe-cream rounded-full shadow-2xl z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all",
                isActive ? "text-cafe-gold scale-110" : "text-cafe-cream/60"
              )
            }
          >
            <item.icon size={24} />
          </NavLink>
        ))}
      </nav>
    </>
  );
}
