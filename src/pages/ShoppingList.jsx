import { useState } from "react";
import { Link } from "react-router-dom";
import { useFridge } from "../context/useFridge";
import TiltCard from "../components/TiltCard";

export default function ShoppingList() {
  const {
    shoppingList,
    toggleShoppingItem,
    removeShoppingItem,
    addSingleShoppingItem,
    clearCompletedShopping,
    moveShoppingItemToFridge,
  } = useFridge();

  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addSingleShoppingItem(newItemName.trim(), newItemQty.trim() || "1 unit", "Grocery");
    setNewItemName("");
    setNewItemQty("");
  };

  const completedCount = shoppingList.filter((i) => i.checked).length;
  const pendingCount = shoppingList.filter((i) => !i.checked).length;

  return (
    <div className="shopping-list-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-badge">
          <span>🛒</span> Smart Grocery Automation
        </div>
        <h1>Shopping List</h1>
        <p>
          Ingredients missing from your favorite recipes appear here automatically. Once bought, transfer them directly into your fridge inventory.
        </p>
      </div>

      <TiltCard className="shopping-card-container">
        {/* Quick Add Form */}
        <form onSubmit={handleAddItem} className="shopping-input-row">
          <input
            type="text"
            placeholder="Add grocery item (e.g. Greek Yogurt, Olive Oil)..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="input-glass"
            style={{ flex: 2 }}
          />
          <input
            type="text"
            placeholder="Qty (e.g. 500ml, 1pk)"
            value={newItemQty}
            onChange={(e) => setNewItemQty(e.target.value)}
            className="input-glass"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" style={{ flex: "none" }}>
            + Add
          </button>
        </form>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 4px 18px",
            borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-muted)" }}>
            {pendingCount} Pending • {completedCount} Purchased
          </span>

          {completedCount > 0 && (
            <button
              onClick={clearCompletedShopping}
              className="btn-card-action"
              style={{ fontSize: "12px" }}
            >
              Clear Completed ({completedCount})
            </button>
          )}
        </div>

        {/* Shopping Items List */}
        {shoppingList.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 10px",
              color: "var(--color-text-light)",
            }}
          >
            <div style={{ fontSize: "42px", marginBottom: "8px" }}>🎉</div>
            <h3 style={{ margin: "0 0 6px", color: "var(--color-text-main)" }}>
              Your shopping list is empty!
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "14px" }}>
              Explore recipes to automatically add missing ingredients, or type an item above.
            </p>
            <Link to="/recipes" className="btn-secondary" style={{ textDecoration: "none" }}>
              Explore Recipes →
            </Link>
          </div>
        ) : (
          <div className="shopping-items-list">
            {shoppingList.map((item) => (
              <div
                key={item.id}
                className={`shopping-item-row ${item.checked ? "completed" : ""}`}
              >
                <div className="shopping-item-left">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleShoppingItem(item.id)}
                    className="shopping-checkbox"
                  />
                  <div>
                    <div className="shopping-item-name">{item.name}</div>
                    <div className="shopping-item-origin">
                      Qty: {item.quantity} • {item.fromRecipe ? `From: ${item.fromRecipe}` : "Grocery"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {item.checked ? (
                    <button
                      className="btn-primary"
                      onClick={() => moveShoppingItemToFridge(item, 7)}
                      style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "10px" }}
                      title="Directly add to fridge inventory"
                    >
                      🧊 Send to Fridge
                    </button>
                  ) : (
                    <button
                      className="btn-secondary"
                      onClick={() => toggleShoppingItem(item.id)}
                      style={{ padding: "6px 10px", fontSize: "12px" }}
                    >
                      Mark Bought
                    </button>
                  )}

                  <button
                    className="btn-card-action danger"
                    onClick={() => removeShoppingItem(item.id)}
                    title="Remove item"
                    style={{ padding: "6px 8px" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TiltCard>
    </div>
  );
}