import { Boxes, ClipboardList } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <strong>Saga Ops</strong>
            <span>Orders & inventory</span>
          </div>
        </div>
        <nav className="nav-list">
          <NavLink to="/orders">
            <ClipboardList size={18} />
            Orders
          </NavLink>
          <NavLink to="/products">
            <Boxes size={18} />
            Products
          </NavLink>
        </nav>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
