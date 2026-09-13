import { useState } from "react";
import { useFridge } from "../context/useFridge";
import TiltCard from "../components/TiltCard";

export default function SavedRecipes() {
  const { savedRecipes, fridgeItems, saveNewRecipe, deleteSavedRecipe, addToShoppingList } = useFridge();

  const [activeTab, setActiveTab] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  // New recipe form state
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newSourceType, setNewSourceType] = useState("instagram");
  const [newAuthor, setNewAuthor] = useState("");
  const [newIngredients, setNewIngredients] = useState("");

  const filteredRecipes = savedRecipes.filter((r) => {
    if (activeTab === "all") return true;
    return r.sourceType === activeTab;
  });

  // Calculate matching for saved recipe
  const getRecipeFridgeMatch = (ingredients) => {
    if (!ingredients || ingredients.length === 0) {
      return { percent: 100, have: 0, total: 0, items: [] };
    }
    const items = ingredients.map((ing) => {
      const inFridge = fridgeItems.some((fi) =>
        fi.name.toLowerCase().includes(ing.name.toLowerCase())
      );
      return { ...ing, inFridge };
    });
    const have = items.filter((i) => i.inFridge).length;
    const percent = Math.round((have / items.length) * 100);
    return { percent, have, total: items.length, items };
  };

  const handleSaveRecipeSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const ingList = newIngredients
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean)
      .map((name) => ({ name, amount: "1 unit" }));

    saveNewRecipe({
      title: newTitle,
      source: newSourceType === "instagram" ? "Instagram Reel" : "YouTube",
      sourceType: newSourceType,
      sourceUrl: newUrl || (newSourceType === "instagram" ? "https://instagram.com" : "https://youtube.com"),
      author: newAuthor || (newSourceType === "instagram" ? "@chef_gram" : "Cooking Channel"),
      thumbnail: newSourceType === "instagram" ? "📱" : "▶️",
      prepTime: "20 mins",
      difficulty: "Easy",
      rating: 4.8,
      description: "Custom saved social media recipe",
      ingredients: ingList.length > 0 ? ingList : [{ name: "Tomatoes", amount: "2 pcs" }, { name: "Eggs", amount: "2 pcs" }],
    });

    setNewTitle("");
    setNewUrl("");
    setNewAuthor("");
    setNewIngredients("");
    setShowAddModal(false);
  };

  return (
    <div className="saved-recipes-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-badge">
          <span>❤️</span> Saved Social Media Recipes
        </div>
        <h1>Saved Recipes</h1>
        <p>
          Bookmark your favorite YouTube and Instagram cooking videos. Smart Fridge automatically analyzes missing ingredients.
        </p>
      </div>

      {/* Tabs & Add Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div className="saved-tabs-row" style={{ margin: 0 }}>
          <button
            className={`saved-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Saved ({savedRecipes.length})
          </button>
          <button
            className={`saved-tab-btn ${activeTab === "youtube" ? "active" : ""}`}
            onClick={() => setActiveTab("youtube")}
          >
            ▶️ YouTube ({savedRecipes.filter((r) => r.sourceType === "youtube").length})
          </button>
          <button
            className={`saved-tab-btn ${activeTab === "instagram" ? "active" : ""}`}
            onClick={() => setActiveTab("instagram")}
          >
            📱 Instagram Reels ({savedRecipes.filter((r) => r.sourceType === "instagram").length})
          </button>
        </div>

        <button
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ padding: "10px 18px", fontSize: "14px" }}
        >
          <span>+</span> Save Link / Reel
        </button>
      </div>

      {/* Grid of Saved Recipes */}
      {filteredRecipes.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "rgba(255,255,255,0.6)",
            borderRadius: "24px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <div style={{ fontSize: "52px", marginBottom: "12px" }}>📱</div>
          <h3 style={{ margin: "0 0 8px" }}>No saved recipes found</h3>
          <p style={{ color: "var(--color-text-light)", marginBottom: "18px" }}>
            Paste any Instagram cooking reel or YouTube video to track its ingredients.
          </p>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Recipe Link
          </button>
        </div>
      ) : (
        <div className="recipe-cards-grid">
          {filteredRecipes.map((recipe) => {
            const match = getRecipeFridgeMatch(recipe.ingredients);

            return (
              <TiltCard key={recipe.id} className="recipe-match-card">
                <div className="recipe-card-header">
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                      <span className={`source-badge ${recipe.sourceType}`}>
                        {recipe.sourceType === "youtube" ? "▶️ YouTube" : "📱 Instagram"}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--color-text-light)" }}>
                        {recipe.author}
                      </span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: "19px", fontFamily: "var(--font-display)" }}>
                      {recipe.title}
                    </h3>
                  </div>

                  <div
                    className={`match-score-badge ${
                      match.percent >= 70 ? "high" : "medium"
                    }`}
                  >
                    <span>{match.percent}% Match</span>
                  </div>
                </div>

                <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "0 0 12px" }}>
                  {recipe.description}
                </p>

                {/* Ingredients checklist */}
                <div className="recipe-ingredients-checklist">
                  {match.items.map((ing, i) => (
                    <div
                      key={i}
                      className={`ingredient-check-item ${ing.inFridge ? "have" : "missing"}`}
                    >
                      <span>
                        {ing.inFridge ? "✓" : "✗"} {ing.name} ({ing.amount || "1 unit"})
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 600 }}>
                        {ing.inFridge ? "In Fridge" : "Need to Buy"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Card Actions */}
                <div className="recipe-card-actions">
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ textDecoration: "none", flex: 1, padding: "10px 14px", fontSize: "13px" }}
                  >
                    Watch Reel ↗
                  </a>

                  <button
                    className="btn-primary"
                    style={{ flex: 1.3, padding: "10px 14px", fontSize: "13px" }}
                    onClick={() => {
                      const missing = match.items
                        .filter((i) => !i.inFridge)
                        .map((i) => ({
                          name: i.name,
                          amount: i.amount || "1 unit",
                          category: "Grocery",
                          fromRecipe: recipe.title,
                        }));
                      addToShoppingList(missing);
                    }}
                  >
                    🛒 + To Shopping
                  </button>

                  <button
                    className="btn-card-action danger"
                    onClick={() => deleteSavedRecipe(recipe.id)}
                    title="Delete saved recipe"
                    style={{ padding: "0 10px" }}
                  >
                    ✕
                  </button>
                </div>
              </TiltCard>
            );
          })}
        </div>
      )}

      {/* Save New Recipe / Reel Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="product-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
              ✕
            </button>

            <h2 style={{ fontFamily: "var(--font-display)", margin: "0 0 16px" }}>
              Save Instagram Reel or YouTube Recipe
            </h2>

            <form onSubmit={handleSaveRecipeSubmit}>
              <div className="modal-section">
                <div className="modal-section-title">PLATFORM</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className={`btn-secondary ${newSourceType === "instagram" ? "active" : ""}`}
                    onClick={() => setNewSourceType("instagram")}
                    style={{
                      flex: 1,
                      border: newSourceType === "instagram" ? "2px solid #ec4899" : "",
                      color: newSourceType === "instagram" ? "#ec4899" : "",
                    }}
                  >
                    📱 Instagram Reel
                  </button>
                  <button
                    type="button"
                    className={`btn-secondary ${newSourceType === "youtube" ? "active" : ""}`}
                    onClick={() => setNewSourceType("youtube")}
                    style={{
                      flex: 1,
                      border: newSourceType === "youtube" ? "2px solid #ef4444" : "",
                      color: newSourceType === "youtube" ? "#ef4444" : "",
                    }}
                  >
                    ▶️ YouTube Video
                  </button>
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-title">RECIPE TITLE</div>
                <input
                  type="text"
                  placeholder="e.g. 10-Minute Creamy Avocado Toast"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input-glass"
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div className="modal-section">
                <div className="modal-section-title">URL / REEL LINK</div>
                <input
                  type="url"
                  placeholder="https://instagram.com/reel/... or https://youtube.com/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="input-glass"
                  style={{ width: "100%" }}
                />
              </div>

              <div className="modal-section">
                <div className="modal-section-title">CHEF / AUTHOR (OPTIONAL)</div>
                <input
                  type="text"
                  placeholder="e.g. @healthycooking"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="input-glass"
                  style={{ width: "100%" }}
                />
              </div>

              <div className="modal-section">
                <div className="modal-section-title">INGREDIENTS (COMMA-SEPARATED)</div>
                <input
                  type="text"
                  placeholder="e.g. Eggs, Avocado, Sourdough Bread, Olive Oil"
                  value={newIngredients}
                  onChange={(e) => setNewIngredients(e.target.value)}
                  className="input-glass"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  ❤️ Save Recipe
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
