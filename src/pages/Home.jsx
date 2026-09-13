import { Link } from "react-router-dom";
import { useFridge } from "../context/useFridge";
import TiltCard from "../components/TiltCard";

export default function Home() {
  const { fridgeItems, shoppingList, expiringSoonCount, getExpiryInfo } = useFridge();
  const unboughtCount = shoppingList.filter((i) => !i.checked).length;
  const freshCount = fridgeItems.filter((item) => getExpiryInfo(item.expiryDate).status === "fresh").length;
  const nextExpiry = [...fridgeItems]
    .filter((item) => getExpiryInfo(item.expiryDate).diffDays >= 0)
    .sort((a, b) => getExpiryInfo(a.expiryDate).diffDays - getExpiryInfo(b.expiryDate).diffDays)[0];
  const nextExpiryInfo = nextExpiry ? getExpiryInfo(nextExpiry.expiryDate) : null;
  const healthScore = fridgeItems.length
    ? Math.round((freshCount / fridgeItems.length) * 100)
    : 100;

  return (
    <div className="home-view">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="page-header-badge"><span className="live-dot" /> KITCHEN INTELLIGENCE ONLINE</div>
          <p className="hero-kicker">Good to see you</p>
          <h1>Your food, beautifully in flow.</h1>
          <p className="hero-description">
            Track every item, use what is freshest, and turn what you have into something worth cooking.
          </p>
          <div className="hero-actions">
            <Link to="/scan" className="btn-primary" style={{ textDecoration: "none" }}>
              <span>⌁</span> Scan an item
            </Link>
            <Link to="/recipes" className="btn-quiet">
              Explore recipes <span>→</span>
            </Link>
          </div>
        </div>

        <TiltCard className="fridge-orb-card">
          <div className="orb-noise" />
          <div className="orb-glow orb-glow-one" />
          <div className="orb-glow orb-glow-two" />
          <div className="fridge-orb">🧊</div>
          <div className="orb-card-content">
            <span className="eyebrow-label">FRIDGE HEALTH</span>
            <strong>{healthScore}<small>%</small></strong>
            <span>{freshCount} of {fridgeItems.length} items are fresh</span>
          </div>
          <div className="orb-card-ring" style={{ "--health": `${healthScore * 3.6}deg` }} />
        </TiltCard>
      </section>

      {/* Live Status Summary Banner */}
      <div className="status-banner">
        <div className="status-stat-card">
          <div className="status-stat-icon">🧊</div>
          <div className="status-stat-info">
            <span className="status-stat-value">{fridgeItems.length}</span>
            <span className="status-stat-label">Items in Fridge</span>
          </div>
        </div>

        <div className="status-stat-card">
          <div className="status-stat-icon" style={{ background: "rgba(254, 242, 242, 0.9)" }}>
            {expiringSoonCount > 0 ? "⚠️" : "✅"}
          </div>
          <div className="status-stat-info">
            <span
              className="status-stat-value"
              style={{ color: expiringSoonCount > 0 ? "#dc2626" : "#16a34a" }}
            >
              {expiringSoonCount}
            </span>
            <span className="status-stat-label">
              {expiringSoonCount > 0 ? "Expiring Soon / Expired" : "All Items Fresh"}
            </span>
          </div>
        </div>

        <div className="status-stat-card">
          <div className="status-stat-icon">🛒</div>
          <div className="status-stat-info">
            <span className="status-stat-value">{unboughtCount}</span>
            <span className="status-stat-label">To Buy in Shopping List</span>
          </div>
        </div>
      </div>

      <section className="command-center" aria-label="Kitchen priorities">
        <div className="command-center-head">
          <div>
            <span className="eyebrow-label">KITCHEN PULSE</span>
            <h2>What deserves your attention</h2>
          </div>
          <Link to="/fridge" className="text-action">View inventory →</Link>
        </div>
        <div className="pulse-grid">
          <div className="pulse-item pulse-item-expiry">
            <span className="pulse-icon">⏳</span>
            <div>
              <span className="pulse-label">USE NEXT</span>
              <strong>{nextExpiry ? nextExpiry.name : "Your fridge is clear"}</strong>
              <p>{nextExpiryInfo ? `${nextExpiryInfo.statusLabel} · make it count` : "Add your first item to start tracking"}</p>
            </div>
          </div>
          <div className="pulse-item">
            <span className="pulse-icon">🧺</span>
            <div>
              <span className="pulse-label">SHOPPING QUEUE</span>
              <strong>{unboughtCount ? `${unboughtCount} item${unboughtCount === 1 ? "" : "s"} to pick up` : "All caught up"}</strong>
              <p>{unboughtCount ? "Your recipe list is ready when you are" : "Nothing waiting in your basket"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3D Tilt Dashboard Cards */}
      <div className="home-dashboard-grid">
        <div className="card-wrapper">
          <Link to="/scan" className="dashboard-nav-card">
            <TiltCard className="card-inner">
              <div className="card-icon-bubble">📦</div>
              <span className="card-index">01 · CAPTURE</span>
              <h2 className="card-title">Scan Product</h2>
              <p className="card-desc">Identify a barcode with the camera or enter one manually.</p>
              <div className="card-action-arrow">→</div>
            </TiltCard>
          </Link>
        </div>

        <div className="card-wrapper">
          <Link to="/fridge" className="dashboard-nav-card">
            <TiltCard className="card-inner">
              <div className="card-icon-bubble">🧊</div>
              <span className="card-index">02 · TRACK</span>
              <h2 className="card-title">My Fridge</h2>
              <p className="card-desc">Track real-time inventory, shelf life countdowns & categories</p>
              <div className="card-action-arrow">→</div>
            </TiltCard>
          </Link>
        </div>

        <div className="card-wrapper">
          <Link to="/recipes" className="dashboard-nav-card">
            <TiltCard className="card-inner">
              <div className="card-icon-bubble">🍳</div>
              <span className="card-index">03 · CREATE</span>
              <h2 className="card-title">Recipes</h2>
              <p className="card-desc">Instant % match based on available ingredients in your fridge</p>
              <div className="card-action-arrow">→</div>
            </TiltCard>
          </Link>
        </div>

        <div className="card-wrapper">
          <Link to="/saved" className="dashboard-nav-card">
            <TiltCard className="card-inner">
              <div className="card-icon-bubble">❤️</div>
              <span className="card-index">04 · SAVE</span>
              <h2 className="card-title">Saved Recipes</h2>
              <p className="card-desc">Save cooking videos from YouTube & Instagram reels</p>
              <div className="card-action-arrow">→</div>
            </TiltCard>
          </Link>
        </div>

        <div className="card-wrapper">
          <Link to="/shopping-list" className="dashboard-nav-card">
            <TiltCard className="card-inner">
              <div className="card-icon-bubble">🛒</div>
              <span className="card-index">05 · SHOP</span>
              <h2 className="card-title">Shopping List</h2>
              <p className="card-desc">Automatically collect missing recipe ingredients & buy</p>
              <div className="card-action-arrow">→</div>
            </TiltCard>
          </Link>
        </div>
      </div>
    </div>
  );
}
