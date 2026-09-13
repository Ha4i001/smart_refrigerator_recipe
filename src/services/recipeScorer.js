/**
 * Multi-Factor Recipe Suitability & Food Waste Optimization Scorer
 * 
 * Ranks recipes not merely on keyword matches, but prioritizes food-waste reduction,
 * ingredient shelf-life urgency, minimal shopping requirements, cooking time, and dietary constraints.
 */

// Calculate difference in days from today
export function getDiffDays(expiryDateStr) {
  if (!expiryDateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Check whether a recipe ingredient key matches any fridge inventory item
export function matchIngredientToFridge(ingredientKey, ingredientName, fridgeItems = []) {
  if (!fridgeItems || !fridgeItems.length) return null;
  const key = (ingredientKey || "").toLowerCase();
  const name = (ingredientName || "").toLowerCase();

  // Find best match in fridge items
  for (const item of fridgeItems) {
    const itemName = (item.name || "").toLowerCase();
    const itemBrand = (item.brand || "").toLowerCase();
    const itemCategory = (item.category || "").toLowerCase();

    // Check direct substring matches
    if (
      (key && itemName.includes(key)) ||
      (name && itemName.includes(name)) ||
      (key && itemBrand && itemBrand.includes(key)) ||
      (key && key.includes(itemName)) ||
      (key && itemCategory.includes(key)) ||
      (key === "egg" && /egg|eggs|omelette/.test(itemName)) ||
      (key === "milk" && /milk|lait|dairy/.test(itemName)) ||
      (key === "chicken" && /chicken|poultry/.test(itemName)) ||
      (key === "tomato" && /tomato|tomatoes/.test(itemName)) ||
      (key === "bread" && /bread|sourdough|toast|bun|pav/.test(itemName)) ||
      (key === "cheese" && /cheese|cheddar|parmesan|mozzarella/.test(itemName)) ||
      (key === "pasta" && /pasta|penne|spaghetti|macaroni|noodle/.test(itemName)) ||
      (key === "avocado" && /avocado|guacamole/.test(itemName)) ||
      (key === "yogurt" && /yogurt|curd/.test(itemName))
    ) {
      return item;
    }
  }
  return null;
}

/**
 * Score and rank recipes based on multi-factor intelligence:
 * 1. Percentage of ingredients already in fridge
 * 2. Expiry urgency boost (highest weight to items expiring in 0-3 days)
 * 3. Minimal missing ingredients (waste prevention & avoid shopping)
 * 4. User dietary/timing criteria
 */
export function scoreAndRankRecipes(recipes = [], fridgeItems = [], criteria = {}) {
  const {
    maxTime = null,
    dietary = null, // 'vegetarian' | 'high-protein' | 'vegan' | 'quick'
    avoidShopping = false,
    preferredIngredients = [],
    query = "",
  } = criteria;

  const scored = recipes.map((recipe) => {
    let availableCount = 0;
    const availableIngredients = [];
    const missingIngredients = [];
    const expiringIngredientsUsed = [];

    // Analyze each ingredient
    recipe.ingredients.forEach((ing) => {
      const matched = matchIngredientToFridge(ing.key, ing.name, fridgeItems);
      if (matched) {
        availableCount += 1;
        const diffDays = getDiffDays(matched.expiryDate);
        const isExpiringSoon = diffDays >= 0 && diffDays <= 3;
        const isExpired = diffDays < 0;

        const info = {
          name: ing.name,
          key: ing.key,
          amount: ing.amount,
          matchedName: matched.name,
          diffDays,
          isExpiringSoon,
          isExpired,
        };

        availableIngredients.push(info);
        if (isExpiringSoon && !isExpired) {
          expiringIngredientsUsed.push(info);
        }
      } else {
        missingIngredients.push({
          name: ing.name,
          key: ing.key,
          amount: ing.amount,
          category: ing.category || "Grocery",
          isEssential: ing.isEssential ?? true,
        });
      }
    });

    const totalCount = recipe.ingredients.length || 1;
    const matchPercentage = Math.round((availableCount / totalCount) * 100);

    // Multi-factor suitability calculation (Base 0 - 100)
    let score = matchPercentage * 0.55; // 55% weight on raw availability

    // Food Waste Reduction Factor: Boost by shelf-life urgency
    let wasteScoreBonus = 0;
    expiringIngredientsUsed.forEach((item) => {
      if (item.diffDays <= 1) {
        wasteScoreBonus += 25; // Critical: expires today or tomorrow
      } else if (item.diffDays <= 2) {
        wasteScoreBonus += 18;
      } else if (item.diffDays <= 3) {
        wasteScoreBonus += 12;
      }
    });

    // Synergy bonus: consuming 2 or more expiring items in one meal
    if (expiringIngredientsUsed.length >= 2) {
      wasteScoreBonus += 12;
    }

    score += Math.min(wasteScoreBonus, 40); // Cap waste bonus at 40 points

    // Missing ingredient penalty
    score -= missingIngredients.length * 6;

    // "Avoid shopping" / "Ready now" preference
    if (avoidShopping && missingIngredients.length === 0) {
      score += 20;
    } else if (avoidShopping && missingIngredients.length > 0) {
      score -= missingIngredients.length * 15;
    }

    // Dietary tag filters & bonuses
    if (dietary) {
      const lowerDiet = dietary.toLowerCase();
      if (lowerDiet.includes("veg") && recipe.tags.includes("vegetarian")) {
        score += 15;
      } else if (lowerDiet.includes("veg") && !recipe.tags.includes("vegetarian")) {
        score -= 50; // Incompatible with vegetarian request
      }

      if (lowerDiet.includes("protein") && (recipe.tags.includes("high-protein") || parseInt(recipe.protein) >= 25)) {
        score += 20;
      }

      if (lowerDiet.includes("quick") && (recipe.totalMinutes <= 15 || recipe.tags.includes("quick"))) {
        score += 15;
      }
    }

    // Max cooking time filter
    if (maxTime && recipe.totalMinutes) {
      if (recipe.totalMinutes <= maxTime) {
        score += 10;
      } else {
        score -= (recipe.totalMinutes - maxTime) * 2;
      }
    }

    // Preferred ingredients check
    if (preferredIngredients.length > 0) {
      const hasPreferred = preferredIngredients.some((pref) => {
        const p = pref.toLowerCase();
        return recipe.ingredients.some((i) => i.name.toLowerCase().includes(p) || (i.key && i.key.includes(p)));
      });
      if (hasPreferred) score += 20;
    }

    // Query terms bonus
    if (query) {
      const q = query.toLowerCase();
      if (recipe.title.toLowerCase().includes(q)) score += 15;
      if (recipe.tags.some((t) => q.includes(t))) score += 10;
    }

    // Clamp score between 0 and 99 (or 100 if all available and no missing)
    const finalScore = Math.max(5, Math.min(100, Math.round(score)));

    // Generate smart priority explanation badge
    let priorityBadge;
    if (expiringIngredientsUsed.length > 0) {
      const names = expiringIngredientsUsed.map((i) => i.name.split(" ")[0]).join(" & ");
      priorityBadge = `🔥 Uses ${names} expiring soon`;
    } else if (missingIngredients.length === 0) {
      priorityBadge = "✅ 100% Ready (Zero Shopping)";
    } else if (matchPercentage >= 75) {
      priorityBadge = `⚡ High Pantry Match (${missingIngredients.length} missing)`;
    } else {
      priorityBadge = `🛒 Requires ${missingIngredients.length} items`;
    }

    // Generate concise rationale
    let explanation;
    if (expiringIngredientsUsed.length > 0) {
      explanation = `Saves your ${expiringIngredientsUsed.map((i) => `${i.name} (${i.diffDays === 0 ? "expires today" : i.diffDays === 1 ? "expires tomorrow" : `expires in ${i.diffDays}d`})`).join(", ")} from going to waste.`;
    } else if (missingIngredients.length === 0) {
      explanation = `All ${totalCount} ingredients are ready in your fridge. No shopping required!`;
    } else {
      explanation = `${availableCount} of ${totalCount} ingredients on hand. Only missing ${missingIngredients.map((i) => i.name).join(", ")}.`;
    }

    return {
      ...recipe,
      suitabilityScore: finalScore,
      matchPercentage,
      availableIngredients,
      missingIngredients,
      expiringIngredientsUsed,
      priorityBadge,
      explanation,
    };
  });

  // Sort descending by suitability score
  return scored.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}
