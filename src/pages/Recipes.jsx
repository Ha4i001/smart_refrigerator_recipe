import { useState } from "react";
import { useFridge } from "../context/useFridge";
import TiltCard from "../components/TiltCard";
import { MASTER_RECIPES } from "../data/recipes";
import { scoreAndRankRecipes } from "../services/recipeScorer";

export default function Recipes() {
  const { fridgeItems, addToShoppingList, showToast } = useFridge();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMatch, setFilterMatch] = useState("all");

  // Compute multi-factor suitability & waste optimization scores
  const scoredRecipes = scoreAndRankRecipes(MASTER_RECIPES, fridgeItems);

  // Filter recipes based on search and match criteria
  const filteredRecipes = scoredRecipes.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ingredients.some((ing) => ing.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMatch === "high") return r.suitabilityScore >= 75 || r.matchPercentage >= 75;
    if (filterMatch === "ready") return r.matchPercentage === 100 || r.missingIngredients.length === 0;
    return true;
  });

  const handleAddMissingToShoppingList = (recipe) => {
    const missing = recipe.missingIngredients.map((i) => ({
      name: i.name,
      amount: i.amount || "1 unit",
      category: i.category || "Grocery",
      fromRecipe: recipe.title,
    }));

    if (missing.length === 0) {
      showToast("You already have all ingredients in your fridge!", "🎉");
      return;
    }

    addToShoppingList(missing);
  };

  return (
    <div className="recipes-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-badge">
          <span>🍳</span> Smart Culinary Matchmaker
        </div>
        <h1>Recipe Suggestions</h1>
        <p>
          Algorithmic matching calculates recipes you can make right now based on ingredients currently in your fridge, prioritizing items expiring soonest.
        </p>
      </div>

      <div className="recipes-layout">
        {/* Controls: Search & Match Filter Tabs */}
        <div className="fridge-controls-bar" style={{ marginBottom: "28px" }}>
          <div className="search-input-wrapper">
            <span className="search-icon-left">🔍</span>
            <input
              type="text"
              placeholder="Search recipes or ingredients (e.g. chicken, pasta, eggs)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-pills-row">
            <button
              type="button"
              className={`filter-pill ${filterMatch === "all" ? "active" : ""}`}
              onClick={() => setFilterMatch("all")}
            >
              All Recipes ({scoredRecipes.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${filterMatch === "high" ? "active" : ""}`}
              onClick={() => setFilterMatch("high")}
            >
              ⭐ 75%+ Suitability ({scoredRecipes.filter((r) => r.suitabilityScore >= 75 || r.matchPercentage >= 75).length})
            </button>
            <button
              type="button"
              className={`filter-pill ${filterMatch === "ready" ? "active" : ""}`}
              onClick={() => setFilterMatch("ready")}
            >
              🎉 100% Ready to Cook ({scoredRecipes.filter((r) => r.missingIngredients.length === 0).length})
            </button>
          </div>
        </div>

        {/* Recipe Cards Grid */}
        <div className="recipe-cards-grid">
          {filteredRecipes.map((recipe) => (
            <TiltCard key={recipe.id} className="recipe-match-card">
              <div className="recipe-card-header">
                <div>
                  <span className="badge-pill" style={{ marginBottom: "6px" }}>
                    {recipe.category} • {recipe.time}
                  </span>
                  <h3 style={{ margin: "4px 0 0", fontSize: "19px", fontFamily: "var(--font-display)" }}>
                    {recipe.title}
                  </h3>
                </div>

                <div
                  className={`match-score-badge ${
                    recipe.suitabilityScore >= 75 ? "high" : "medium"
                  }`}
                  title={`${recipe.matchPercentage}% of ingredients available in fridge`}
                >
                  <span>{recipe.suitabilityScore >= 75 ? "⭐" : "🥘"}</span>
                  <span>{recipe.suitabilityScore}% Match</span>
                </div>
              </div>

              {recipe.priorityBadge && (
                <div
                  style={{
                    background: recipe.priorityBadge.includes("🔥") ? "#fff1f2" : "#f0fdf4",
                    color: recipe.priorityBadge.includes("🔥") ? "#e11d48" : "#166534",
                    border: `1px solid ${recipe.priorityBadge.includes("🔥") ? "#fecdd3" : "#bbf7d0"}`,
                    padding: "4px 12px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    margin: "10px 0 6px",
                  }}
                >
                  {recipe.priorityBadge}
                </div>
              )}

              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "4px 0 12px" }}>
                {recipe.description}
              </p>

              {/* Ingredient Matching Breakdown */}
              <div className="recipe-ingredients-checklist">
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-light)" }}>
                  INGREDIENT MATCH ({recipe.availableIngredients.length}/{recipe.ingredients.length} in fridge):
                </div>

                {recipe.availableIngredients.map((ing, idx) => (
                  <div key={`have-${idx}`} className="ingredient-check-item have">
                    <span>✓ {ing.name}</span>
                    <span style={{ fontSize: "11px", fontWeight: 600 }}>
                      {ing.isExpiringSoon ? `⚠️ Expires in ${ing.diffDays}d` : "In Fridge"}
                    </span>
                  </div>
                ))}

                {recipe.missingIngredients.map((ing, idx) => (
                  <div key={`miss-${idx}`} className="ingredient-check-item missing">
                    <span>✗ {ing.name}</span>
                    <span style={{ fontSize: "11px", fontWeight: 600 }}>Missing</span>
                  </div>
                ))}
              </div>

              {/* Actions: YouTube Link & Add Missing to Shopping List */}
              <div className="recipe-card-actions">
                {recipe.youtubeUrl && (
                  <a
                    href={recipe.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ textDecoration: "none", flex: 1, padding: "10px 14px", fontSize: "13px" }}
                  >
                    <span style={{ color: "#ef4444" }}>▶</span> YouTube
                  </a>
                )}

                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1.3, padding: "10px 14px", fontSize: "13px" }}
                  onClick={() => handleAddMissingToShoppingList(recipe)}
                >
                  <span>🛒</span> {recipe.missingIngredients.length > 0 ? `+ Add ${recipe.missingIngredients.length} Missing` : "Ready to Cook"}
                </button>
              </div>
            </TiltCard>
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="empty-state-card" style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <span style={{ fontSize: "40px", display: "block", marginBottom: "10px" }}>🔍</span>
            <h3>No matching recipes found</h3>
            <p style={{ margin: "6px 0 16px" }}>Try searching for a different ingredient or clearing your filters.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchTerm("");
                setFilterMatch("all");
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}