import { useState } from "react";
import { Link } from "react-router-dom";
import { useFridge } from "../context/useFridge";
import TiltCard from "../components/TiltCard";

export default function Fridge() {
  const { fridgeItems, removeItemFromFridge, getExpiryInfo } = useFridge();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");

  const categories = ["All", "Dairy", "Produce", "Bakery", "Meat", "Pantry"];

  // Filter items
  const filteredItems = fridgeItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;

    const { status } = getExpiryInfo(item.expiryDate);
    const matchesStatus =
      statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="fridge-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-badge">
          <span>🧊</span> Real-Time Inventory
        </div>
        <h1>My Fridge</h1>
        <p>
          Monitor food freshness, track remaining shelf life, and prevent food spoilage with automated expiry tracking.
        </p>
      </div>

      {/* Controls: Search, Category & Expiry Filters */}
      <div className="fridge-controls-bar">
        <div className="search-input-wrapper">
          <span className="search-icon-left">🔍</span>
          <input
            type="text"
            placeholder="Search food, brand or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-pills-row">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="filter-pills-row">
          <button
            className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All Status
          </button>
          <button
            className={`filter-pill ${statusFilter === "fresh" ? "active" : ""}`}
            onClick={() => setStatusFilter("fresh")}
          >
            🟢 Fresh
          </button>
          <button
            className={`filter-pill ${statusFilter === "expiring_soon" ? "active" : ""}`}
            onClick={() => setStatusFilter("expiring_soon")}
          >
            🟡 Expiring Soon
          </button>
          <button
            className={`filter-pill ${statusFilter === "expired" ? "active" : ""}`}
            onClick={() => setStatusFilter("expired")}
          >
            🔴 Expired
          </button>

          <Link to="/scan" className="btn-primary" style={{ textDecoration: "none", padding: "8px 16px", fontSize: "13px" }}>
            + Scan New Food
          </Link>
        </div>
      </div>

      {/* Food Items Grid */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "rgba(255,255,255,0.6)",
            borderRadius: "24px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <div style={{ fontSize: "52px", marginBottom: "12px" }}>🧊</div>
          <h3 style={{ margin: "0 0 8px", fontSize: "20px" }}>No food items matched</h3>
          <p style={{ color: "var(--color-text-light)", marginBottom: "20px" }}>
            Try changing your filter criteria or scan a new product barcode.
          </p>
          <Link to="/scan" className="btn-primary" style={{ textDecoration: "none" }}>
            Scan Product Now
          </Link>
        </div>
      ) : (
        <div className="fridge-grid">
          {filteredItems.map((item) => {
            const { diffDays, status, statusLabel, color } = getExpiryInfo(item.expiryDate);

            // Calculate progress: assuming typical 14 days max freshness window for bar
            const percent = Math.max(
              0,
              Math.min(100, diffDays <= 0 ? 0 : Math.round((diffDays / 14) * 100))
            );

            return (
              <TiltCard key={item.id} className="fridge-item-card">
                <div className="item-card-top">
                  <div className="item-card-icon">{item.icon || "📦"}</div>
                  <span className={`item-status-pill ${status}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="item-card-info">
                  <h3 className="item-card-title">{item.name}</h3>
                  <div className="item-card-meta">
                    {item.brand} • {item.category} • <strong>{item.quantity}</strong>
                  </div>
                  {item.nutrition && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--color-text-light)",
                        background: "rgba(241, 245, 249, 0.7)",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      {item.nutrition}
                    </div>
                  )}
                </div>

                {/* Shelf Life Progress Bar */}
                <div className="shelf-life-container">
                  <div className="shelf-life-header">
                    <span>
                      {diffDays < 0
                        ? `Expired ${Math.abs(diffDays)}d ago`
                        : `${diffDays} days remaining`}
                    </span>
                    <span style={{ color: color }}>
                      Exp: {item.expiryDate}
                    </span>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${diffDays < 0 ? 100 : percent}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>

                  <div className="item-card-actions">
                    <button
                      className="btn-card-action"
                      onClick={() => removeItemFromFridge(item.id)}
                      title="Mark as consumed"
                    >
                      ✓ Consumed
                    </button>
                    <button
                      className="btn-card-action danger"
                      onClick={() => removeItemFromFridge(item.id)}
                      title="Delete item"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>
      )}
    </div>
  );
}