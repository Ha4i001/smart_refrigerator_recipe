import { NavLink } from "react-router-dom";
import { useFridge } from "../context/useFridge";

export default function Navbar() {
  const { shoppingList, expiringSoonCount } = useFridge();
  const unboughtCount = shoppingList.filter((i) => !i.checked).length;

  return (
    <header className="glass-navbar">
      <div className="navbar-container">
        <NavLink to="/" className="navbar-brand">
          <span className="brand-icon">🧊</span>
          <div className="brand-text">
            <span className="brand-title">Smart Fridge</span>
            <span className="brand-subtitle">IoT Inventory</span>
          </div>
        </NavLink>

        <nav className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Dashboard</span>
          </NavLink>

          <NavLink
            to="/scan"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <span className="nav-icon">📷</span>
            <span className="nav-label">Scan Product</span>
            <span className="nav-pulse-dot" title="ESP32-CAM Ready"></span>
          </NavLink>

          <NavLink
            to="/fridge"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <span className="nav-icon">🧊</span>
            <span className="nav-label">My Fridge</span>
            {expiringSoonCount > 0 && (
              <span className="nav-badge alert" title={`${expiringSoonCount} items expiring soon/expired`}>
                {expiringSoonCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/recipes"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <span className="nav-icon">🍳</span>
            <span className="nav-label">Recipes</span>
          </NavLink>

          <NavLink
            to="/saved"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <span className="nav-icon">❤️</span>
            <span className="nav-label">Saved</span>
          </NavLink>

          <NavLink
            to="/shopping-list"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <span className="nav-icon">🛒</span>
            <span className="nav-label">Shopping</span>
            {unboughtCount > 0 && (
              <span className="nav-badge count">{unboughtCount}</span>
            )}
          </NavLink>
        </nav>

        <div className="navbar-hardware-status">
          <span className="status-dot online"></span>
          <span className="status-text">ESP32-CAM</span>
        </div>
      </div>
    </header>
  );
}
