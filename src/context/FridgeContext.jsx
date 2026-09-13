import { useState, useEffect } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { signInAnonymouslyIfNeeded } from "../auth";
import { useAuth } from "./useAuth";
import { FridgeContext } from "./fridgeContextDef";

// Format dates in local time. `toISOString()` uses UTC and can otherwise shift
// an expiry date by one day for users outside that timezone.
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to compute dates relative to today
const getDateInDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
};

const INITIAL_FRIDGE_ITEMS = [
  {
    id: "item-1",
    barcode: "8901234567890",
    name: "Milma Fresh Cow Milk",
    brand: "Milma",
    category: "Dairy",
    quantity: "1 L",
    expiryDate: getDateInDays(4),
    addedDate: getDateInDays(-2),
    icon: "🥛",
    nutrition: "65 kcal / 100ml | 3.2g Protein",
  },
  {
    id: "item-2",
    barcode: "8901122334455",
    name: "Artisan Sourdough Bread",
    brand: "Daily Bake",
    category: "Bakery",
    quantity: "400 g",
    expiryDate: getDateInDays(2),
    addedDate: getDateInDays(-3),
    icon: "🍞",
    nutrition: "240 kcal / 100g | 8g Protein",
  },
  {
    id: "item-3",
    barcode: "8902233445566",
    name: "Farm Fresh Free-Range Eggs",
    brand: "Happy Farms",
    category: "Dairy",
    quantity: "6 pcs",
    expiryDate: getDateInDays(14),
    addedDate: getDateInDays(-1),
    icon: "🥚",
    nutrition: "72 kcal / egg | 6.3g Protein",
  },
  {
    id: "item-4",
    barcode: "8903344556677",
    name: "Organic Vine Tomatoes",
    brand: "Fresh Direct",
    category: "Produce",
    quantity: "500 g",
    expiryDate: getDateInDays(1),
    addedDate: getDateInDays(-4),
    icon: "🍅",
    nutrition: "18 kcal / 100g | Rich in Vitamin C",
  },
  {
    id: "item-5",
    barcode: "8904455667788",
    name: "Boneless Chicken Breast",
    brand: "Prime Cuts",
    category: "Meat",
    quantity: "500 g",
    expiryDate: getDateInDays(5),
    addedDate: getDateInDays(-1),
    icon: "🍗",
    nutrition: "165 kcal / 100g | 31g Protein",
  },
  {
    id: "item-6",
    barcode: "8905566778899",
    name: "Durum Wheat Penne Pasta",
    brand: "Barilla",
    category: "Pantry",
    quantity: "500 g",
    expiryDate: getDateInDays(120),
    addedDate: getDateInDays(-10),
    icon: "🍝",
    nutrition: "350 kcal / 100g | High Carb",
  },
  {
    id: "item-7",
    barcode: "8906677889900",
    name: "Greek Yogurt Strawberry",
    brand: "Epigamia",
    category: "Dairy",
    quantity: "150 g",
    expiryDate: getDateInDays(-1), // expired yesterday to demo alert
    addedDate: getDateInDays(-8),
    icon: "🍓",
    nutrition: "95 kcal / 100g | 6g Protein",
  },
];

const INITIAL_SHOPPING_LIST = [
  {
    id: "shop-1",
    name: "Parmesan Cheese",
    quantity: "100 g",
    category: "Dairy",
    fromRecipe: "Creamy Chicken Penne",
    checked: false,
  },
  {
    id: "shop-2",
    name: "Heavy Cooking Cream",
    quantity: "200 ml",
    category: "Dairy",
    fromRecipe: "Creamy Chicken Penne",
    checked: false,
  },
  {
    id: "shop-3",
    name: "Fresh Sweet Basil",
    quantity: "1 bunch",
    category: "Produce",
    fromRecipe: "Tomato Shakshuka",
    checked: false,
  },
  {
    id: "shop-4",
    name: "Extra Virgin Olive Oil",
    quantity: "500 ml",
    category: "Pantry",
    fromRecipe: "Manual Addition",
    checked: true,
  },
];

const INITIAL_SAVED_RECIPES = [
  {
    id: "rec-1",
    title: "Creamy Tuscan Chicken Pasta",
    source: "YouTube",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    author: "Chef Gordon's Kitchen",
    thumbnail: "🍝",
    prepTime: "25 mins",
    difficulty: "Medium",
    rating: 4.9,
    description: "Rich pan-seared chicken with garlic tomato cream sauce tossed with penne.",
    ingredients: [
      { name: "Chicken Breast", amount: "300 g" },
      { name: "Penne Pasta", amount: "250 g" },
      { name: "Tomatoes", amount: "2 pcs" },
      { name: "Milk", amount: "100 ml" },
      { name: "Heavy Cream", amount: "150 ml" },
      { name: "Parmesan Cheese", amount: "50 g" },
    ],
  },
  {
    id: "rec-2",
    title: "15-Minute Spicy Shakshuka",
    source: "Instagram Reel",
    sourceType: "instagram",
    sourceUrl: "https://www.instagram.com/reel/C8_demo123",
    author: "@quickeats_foodie",
    thumbnail: "🍳",
    prepTime: "15 mins",
    difficulty: "Easy",
    rating: 4.8,
    description: "Poached eggs nestled in a simmered spicy tomato and bell pepper sauce.",
    ingredients: [
      { name: "Eggs", amount: "3 pcs" },
      { name: "Tomatoes", amount: "3 pcs" },
      { name: "Bread", amount: "2 slices" },
      { name: "Olive Oil", amount: "1 tbsp" },
      { name: "Fresh Basil", amount: "handful" },
    ],
  },
  {
    id: "rec-3",
    title: "Fluffy French Herb Omelette",
    source: "YouTube",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=demoOmelette",
    author: "French Cooking Academy",
    thumbnail: "🥚",
    prepTime: "8 mins",
    difficulty: "Easy",
    rating: 4.9,
    description: "Silky soft-curd French rolled omelette with butter and fresh herbs.",
    ingredients: [
      { name: "Eggs", amount: "3 pcs" },
      { name: "Milk", amount: "2 tbsp" },
      { name: "Bread", amount: "1 slice" },
    ],
  },
];

// Concurrency guards to prevent duplicate seeding during rapid startup/remounts
const activeSeedingUids = new Set();
const activeShoppingSeedingUids = new Set();
const activeRecipeSeedingUids = new Set();

export function FridgeProvider({ children }) {
  const { uid } = useAuth();

  const [fridgeItems, setFridgeItems] = useState(() => {
    try {
      const saved = localStorage.getItem("sf_fridge_items");
      return saved ? JSON.parse(saved) : INITIAL_FRIDGE_ITEMS;
    } catch {
      return INITIAL_FRIDGE_ITEMS;
    }
  });

  const [shoppingList, setShoppingList] = useState(() => {
    try {
      const saved = localStorage.getItem("sf_shopping_list");
      return saved ? JSON.parse(saved) : INITIAL_SHOPPING_LIST;
    } catch {
      return INITIAL_SHOPPING_LIST;
    }
  });

  const [savedRecipes, setSavedRecipes] = useState(() => {
    try {
      const saved = localStorage.getItem("sf_saved_recipes");
      return saved ? JSON.parse(saved) : INITIAL_SAVED_RECIPES;
    } catch {
      return INITIAL_SAVED_RECIPES;
    }
  });

  const [toast, setToast] = useState(null);

  // Sync fridgeItems from Firestore when authenticated UID is ready
  useEffect(() => {
    const activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid || !db) return;

    let unsubscribe = () => {};
    let isCancelled = false;

    const syncFridgeItems = async () => {
      try {
        const itemsCol = collection(db, "users", activeUid, "fridgeItems");
        const existingSnap = await getDocs(itemsCol);

        if (isCancelled) return;

        // Seed collection ONLY ONCE if Firestore is genuinely empty and not already seeding
        if (existingSnap.empty && !activeSeedingUids.has(activeUid)) {
          activeSeedingUids.add(activeUid);
          try {
            let seedItems = INITIAL_FRIDGE_ITEMS;
            try {
              const saved = localStorage.getItem("sf_fridge_items");
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  seedItems = parsed;
                }
              }
            } catch (err) {
              console.warn("Failed reading localStorage for seed data:", err);
            }

            const batch = writeBatch(db);
            seedItems.forEach((item) => {
              const newDocRef = doc(itemsCol);
              batch.set(newDocRef, {
                barcode: item.barcode || "",
                name: item.name || "",
                brand: item.brand || "",
                category: item.category || "Pantry",
                quantity: item.quantity || "1 unit",
                expiryDate: item.expiryDate || "",
                addedDate: item.addedDate || formatLocalDate(new Date()),
                icon: item.icon || "📦",
                nutrition: item.nutrition || "",
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error("Failed to seed initial fridge items in Firestore:", seedErr);
          } finally {
            activeSeedingUids.delete(activeUid);
          }
        }

        if (isCancelled) return;

        // Attach real-time Firestore listener
        unsubscribe = onSnapshot(
          itemsCol,
          (snapshot) => {
            const items = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));
            setFridgeItems(items);
            try {
              localStorage.setItem("sf_fridge_items", JSON.stringify(items));
            } catch (err) {
              console.warn("Failed to cache fridgeItems to localStorage:", err);
            }
          },
          (err) => {
            console.error("Firestore onSnapshot error for fridgeItems:", err);
          }
        );
      } catch (err) {
        console.error("Failed to initialize Firestore sync for fridgeItems:", err);
      }
    };

    syncFridgeItems();

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [uid]);

  // Sync shoppingList from Firestore when authenticated UID is ready
  useEffect(() => {
    const activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid || !db) return;

    let unsubscribe = () => {};
    let isCancelled = false;

    const syncShoppingList = async () => {
      try {
        const listCol = collection(db, "users", activeUid, "shoppingList");
        const existingSnap = await getDocs(listCol);

        if (isCancelled) return;

        // Seed collection ONLY ONCE if Firestore is genuinely empty and not already seeding
        if (existingSnap.empty && !activeShoppingSeedingUids.has(activeUid)) {
          activeShoppingSeedingUids.add(activeUid);
          try {
            let seedItems = INITIAL_SHOPPING_LIST;
            try {
              const saved = localStorage.getItem("sf_shopping_list");
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  seedItems = parsed;
                }
              }
            } catch (err) {
              console.warn("Failed reading localStorage for shopping seed data:", err);
            }

            const batch = writeBatch(db);
            seedItems.forEach((item) => {
              const newDocRef = doc(listCol);
              batch.set(newDocRef, {
                name: item.name || "",
                quantity: item.quantity || "1 unit",
                category: item.category || "Grocery",
                fromRecipe: item.fromRecipe || "Manual Added",
                checked: Boolean(item.checked),
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error("[Firestore ShoppingList] Failed to seed data:", seedErr);
          } finally {
            activeShoppingSeedingUids.delete(activeUid);
          }
        }

        if (isCancelled) return;

        // Attach real-time Firestore listener
        unsubscribe = onSnapshot(
          listCol,
          (snapshot) => {
            const items = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));
            setShoppingList(items);
            try {
              localStorage.setItem("sf_shopping_list", JSON.stringify(items));
            } catch (err) {
              console.warn("Failed to cache shoppingList to localStorage:", err);
            }
          },
          (err) => {
            console.error("[Firestore ShoppingList] onSnapshot error:", err);
          }
        );
      } catch (err) {
        console.error("[Firestore ShoppingList] Failed to initialize Firestore sync for shoppingList:", err);
      }
    };

    syncShoppingList();

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [uid]);

  // Sync savedRecipes from Firestore when authenticated UID is ready
  useEffect(() => {
    const activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid || !db) return;

    let unsubscribe = () => {};
    let isCancelled = false;

    const syncSavedRecipes = async () => {
      try {
        const recipesCol = collection(db, "users", activeUid, "savedRecipes");
        const existingSnap = await getDocs(recipesCol);

        if (isCancelled) return;

        // Seed collection ONLY ONCE if Firestore is genuinely empty and not already seeding
        if (existingSnap.empty && !activeRecipeSeedingUids.has(activeUid)) {
          activeRecipeSeedingUids.add(activeUid);
          try {
            let seedItems = INITIAL_SAVED_RECIPES;
            try {
              const saved = localStorage.getItem("sf_saved_recipes");
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  seedItems = parsed;
                }
              }
            } catch (err) {
              console.warn("Failed reading localStorage for recipe seed data:", err);
            }

            const batch = writeBatch(db);
            seedItems.forEach((recipe) => {
              const newDocRef = doc(recipesCol);
              batch.set(newDocRef, {
                title: recipe.title || "",
                source: recipe.source || "Social Media",
                sourceType: recipe.sourceType || "youtube",
                sourceUrl: recipe.sourceUrl || "",
                author: recipe.author || "",
                thumbnail: recipe.thumbnail || "🍲",
                prepTime: recipe.prepTime || "20 mins",
                difficulty: recipe.difficulty || "Easy",
                rating: typeof recipe.rating === "number" ? recipe.rating : 4.8,
                description: recipe.description || "",
                ingredients: Array.isArray(recipe.ingredients)
                  ? recipe.ingredients.map((ing) => ({
                      name: ing.name || "",
                      amount: ing.amount || "1 unit",
                    }))
                  : [],
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error("[Firestore SavedRecipes] Failed to seed data:", seedErr);
          } finally {
            activeRecipeSeedingUids.delete(activeUid);
          }
        }

        if (isCancelled) return;

        // Attach real-time Firestore listener
        unsubscribe = onSnapshot(
          recipesCol,
          (snapshot) => {
            const items = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));
            setSavedRecipes(items);
            try {
              localStorage.setItem("sf_saved_recipes", JSON.stringify(items));
            } catch (err) {
              console.warn("Failed to cache savedRecipes to localStorage:", err);
            }
          },
          (err) => {
            console.error("[Firestore SavedRecipes] onSnapshot error:", err);
          }
        );
      } catch (err) {
        console.error("[Firestore SavedRecipes] Failed to initialize Firestore sync for savedRecipes:", err);
      }
    };

    syncSavedRecipes();

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [uid]);

  const showToast = (message, icon = "✨") => {
    setToast({ message, icon });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Helper calculation for shelf life & expiry status
  const getExpiryInfo = (expiryDateStr) => {
    if (!expiryDateStr) return { diffDays: 999, status: "fresh", statusLabel: "Fresh", color: "#10b981" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status = "fresh";
    let statusLabel;
    let color = "#10b981"; // emerald

    if (diffDays < 0) {
      status = "expired";
      statusLabel = "Expired";
      color = "#ef4444"; // red
    } else if (diffDays <= 3) {
      status = "expiring_soon";
      statusLabel = diffDays === 0 ? "Expires today" : diffDays === 1 ? "Expires tomorrow" : `Expires in ${diffDays} days`;
      color = "#f59e0b"; // amber
    } else {
      statusLabel = `Fresh (${diffDays} days left)`;
    }

    return { diffDays, status, statusLabel, color };
  };

  const addItemToFridge = async (item) => {
    let activeUid = auth?.currentUser?.uid || uid;

    if (!activeUid && auth) {
      const user = await signInAnonymouslyIfNeeded();
      activeUid = user?.uid || auth?.currentUser?.uid || uid;
    }

    if (!activeUid || !db) {
      console.error(
        "[FridgeContext] addItemToFridge failed: No authenticated user UID found.",
        { activeUid, authCurrentUser: auth?.currentUser, dbAvailable: Boolean(db) }
      );
      showToast(`Unable to save ${item.name}: not authenticated.`, "⚠️");
      return;
    }

    const itemData = {
      barcode: item.barcode || "",
      name: item.name || "Unnamed Item",
      brand: item.brand || "Fresh Grocery",
      category: item.category || "Pantry",
      quantity: item.quantity || "1 unit",
      expiryDate: item.expiryDate || getDateInDays(7),
      addedDate: item.addedDate || formatLocalDate(new Date()),
      icon: item.icon || "📦",
      nutrition: item.nutrition || "",
    };

    try {
      await addDoc(collection(db, "users", activeUid, "fridgeItems"), itemData);
      showToast(`Added ${item.name} to My Fridge!`, "🧊");
    } catch (error) {
      console.error("[FridgeContext] Failed to add item to Firestore:", error);
      showToast(`Failed to save ${item.name} to My Fridge.`, "❌");
    }
  };

  const removeItemFromFridge = async (id) => {
    const activeUid = auth?.currentUser?.uid || uid;
    const item = fridgeItems.find((i) => i.id === id);

    if (!activeUid || !db) {
      console.error("[FridgeContext] removeItemFromFridge: No active UID available.");
      showToast(`Unable to remove item: not authenticated.`, "⚠️");
      return;
    }

    try {
      await deleteDoc(doc(db, "users", activeUid, "fridgeItems", id));
      if (item) {
        showToast(`Removed ${item.name} from fridge`, "🗑️");
      }
    } catch (error) {
      console.error("[FridgeContext] Failed to delete item from Firestore:", error);
      showToast(`Failed to remove item from fridge.`, "❌");
    }
  };

  const addToShoppingList = async (items) => {
    if (!items || !items.length) {
      showToast("You already have all of those ingredients!", "🎉");
      return;
    }

    let activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid && auth) {
      const user = await signInAnonymouslyIfNeeded();
      activeUid = user?.uid || auth?.currentUser?.uid || uid;
    }

    if (!activeUid || !db) {
      console.error("[Firestore ShoppingList] Failed to add item: No authenticated user UID found.");
      showToast("Unable to save to Shopping List: not authenticated.", "⚠️");
      return;
    }

    try {
      const shoppingCol = collection(db, "users", activeUid, "shoppingList");
      await Promise.all(
        items.map((item) =>
          addDoc(shoppingCol, {
            name: item.name || "Unnamed Item",
            quantity: item.amount || item.quantity || "1 unit",
            category: item.category || "Grocery",
            fromRecipe: item.fromRecipe || "Recipe",
            checked: false,
          })
        )
      );
      showToast(
        `Added ${items.length} missing ingredient${items.length > 1 ? "s" : ""} to Shopping List!`,
        "🛒"
      );
    } catch (error) {
      console.error("[Firestore ShoppingList] Failed to add item:", error);
      showToast("Failed to add items to Shopping List.", "❌");
    }
  };

  const addSingleShoppingItem = async (name, quantity = "1 unit", category = "Grocery") => {
    let activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid && auth) {
      const user = await signInAnonymouslyIfNeeded();
      activeUid = user?.uid || auth?.currentUser?.uid || uid;
    }

    if (!activeUid || !db) {
      console.error("[Firestore ShoppingList] Failed to add item: No authenticated user UID found.");
      showToast(`Unable to save ${name}: not authenticated.`, "⚠️");
      return;
    }

    const itemData = {
      name,
      quantity: quantity || "1 unit",
      category: category || "Grocery",
      fromRecipe: "Manual Added",
      checked: false,
    };

    try {
      await addDoc(collection(db, "users", activeUid, "shoppingList"), itemData);
      showToast(`Added ${name} to Shopping List`, "🛒");
    } catch (error) {
      console.error("[Firestore ShoppingList] Failed to add item:", error);
      showToast(`Failed to add ${name} to Shopping List.`, "❌");
    }
  };

  const toggleShoppingItem = async (id) => {
    let activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid && auth) {
      const user = await signInAnonymouslyIfNeeded();
      activeUid = user?.uid || auth?.currentUser?.uid || uid;
    }

    if (!activeUid || !db) {
      console.error("[Firestore ShoppingList] Failed to update item: No authenticated user UID found.");
      showToast("Unable to update item: not authenticated.", "⚠️");
      return;
    }

    const item = shoppingList.find((i) => i.id === id);
    if (!item) {
      console.warn("[Firestore ShoppingList] toggleShoppingItem: Item not found with ID:", id);
      return;
    }

    try {
      const docRef = doc(db, "users", activeUid, "shoppingList", id);
      await updateDoc(docRef, {
        checked: !item.checked,
      });
    } catch (error) {
      console.error("[Firestore ShoppingList] Failed to update item:", error);
      showToast("Failed to update shopping item.", "❌");
    }
  };

  const removeShoppingItem = async (id) => {
    let activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid && auth) {
      const user = await signInAnonymouslyIfNeeded();
      activeUid = user?.uid || auth?.currentUser?.uid || uid;
    }

    if (!activeUid || !db) {
      console.error("[Firestore ShoppingList] Failed to delete item: No active UID available.");
      showToast("Unable to remove item: not authenticated.", "⚠️");
      return;
    }

    try {
      await deleteDoc(doc(db, "users", activeUid, "shoppingList", id));
    } catch (error) {
      console.error("[Firestore ShoppingList] Failed to delete item:", error);
      showToast("Failed to remove shopping item.", "❌");
    }
  };

  const clearCompletedShopping = async () => {
    let activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid && auth) {
      const user = await signInAnonymouslyIfNeeded();
      activeUid = user?.uid || auth?.currentUser?.uid || uid;
    }

    if (!activeUid || !db) {
      console.error("[Firestore ShoppingList] Failed to delete item: No active UID available.");
      showToast("Unable to clear items: not authenticated.", "⚠️");
      return;
    }

    const completedItems = shoppingList.filter((i) => i.checked);
    if (completedItems.length === 0) return;

    try {
      const batch = writeBatch(db);
      completedItems.forEach((item) => {
        batch.delete(doc(db, "users", activeUid, "shoppingList", item.id));
      });
      await batch.commit();
      showToast(`Cleared ${completedItems.length} completed items`, "✨");
    } catch (error) {
      console.error("[Firestore ShoppingList] Failed to delete item:", error);
      showToast("Failed to clear completed items.", "❌");
    }
  };

  const moveShoppingItemToFridge = async (shoppingItem, expiryDays = 7) => {
    let activeUid = auth?.currentUser?.uid || uid;

    if (!activeUid && auth) {
      const user = await signInAnonymouslyIfNeeded();
      activeUid = user?.uid || auth?.currentUser?.uid || uid;
    }

    if (!activeUid || !db) {
      console.error("[FridgeContext] moveShoppingItemToFridge: No active UID available.");
      showToast(`Unable to move ${shoppingItem.name}: not authenticated.`, "⚠️");
      return;
    }

    // Normalize category: "Grocery" -> "Pantry"
    const validFridgeCategories = ["Dairy", "Produce", "Bakery", "Meat", "Pantry"];
    let normalizedCategory = shoppingItem.category || "Pantry";
    if (normalizedCategory === "Grocery" || !validFridgeCategories.includes(normalizedCategory)) {
      normalizedCategory = "Pantry";
    }

    const itemData = {
      barcode: `MANUAL-${Math.floor(100000 + Math.random() * 900000)}`,
      name: shoppingItem.name,
      brand: "Fresh Grocery",
      category: normalizedCategory,
      quantity: shoppingItem.quantity || "1 unit",
      expiryDate: getDateInDays(expiryDays),
      addedDate: formatLocalDate(new Date()),
      icon: "🥗",
      nutrition: "Wholesome natural ingredients",
    };

    try {
      const batch = writeBatch(db);

      // 1. Create new fridge item in users/{uid}/fridgeItems
      const newFridgeDocRef = doc(collection(db, "users", activeUid, "fridgeItems"));
      batch.set(newFridgeDocRef, itemData);

      // 2. Remove shopping item from users/{uid}/shoppingList/{id}
      const shoppingDocRef = doc(db, "users", activeUid, "shoppingList", shoppingItem.id);
      batch.delete(shoppingDocRef);

      await batch.commit();

      showToast(`Moved ${shoppingItem.name} into My Fridge!`, "🧊");
    } catch (error) {
      console.error("[Firestore ShoppingList] Failed to move shopping item to fridge:", error);
      showToast(`Failed to move ${shoppingItem.name} into My Fridge.`, "❌");
    }
  };

  const saveNewRecipe = async (recipe) => {
    let activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid && auth) {
      const user = await signInAnonymouslyIfNeeded();
      activeUid = user?.uid || auth?.currentUser?.uid || uid;
    }

    if (!activeUid || !db) {
      console.error("[Firestore SavedRecipes] Failed to save recipe: No authenticated user UID found.");
      showToast(`Unable to save recipe "${recipe.title}": not authenticated.`, "⚠️");
      return;
    }

    const recipeData = {
      title: recipe.title || "Untitled Recipe",
      source: recipe.source || "Social Media",
      sourceType: recipe.sourceType || "youtube",
      sourceUrl: recipe.sourceUrl || "",
      author: recipe.author || "Chef",
      thumbnail: recipe.thumbnail || "🍲",
      prepTime: recipe.prepTime || "20 mins",
      difficulty: recipe.difficulty || "Easy",
      rating: typeof recipe.rating === "number" ? recipe.rating : 4.8,
      description: recipe.description || "",
      ingredients: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map((ing) => ({
            name: ing.name || "",
            amount: ing.amount || "1 unit",
          }))
        : [],
    };

    try {
      await addDoc(collection(db, "users", activeUid, "savedRecipes"), recipeData);
      showToast(`Saved recipe "${recipe.title}"!`, "❤️");
    } catch (error) {
      console.error("[Firestore SavedRecipes] Failed to save recipe:", error);
      showToast(`Failed to save recipe "${recipe.title}".`, "❌");
    }
  };

  const deleteSavedRecipe = async (id) => {
    let activeUid = auth?.currentUser?.uid || uid;
    if (!activeUid && auth) {
      const user = await signInAnonymouslyIfNeeded();
      activeUid = user?.uid || auth?.currentUser?.uid || uid;
    }

    if (!activeUid || !db) {
      console.error("[Firestore SavedRecipes] Failed to delete recipe: No active UID available.");
      showToast("Unable to remove recipe: not authenticated.", "⚠️");
      return;
    }

    try {
      await deleteDoc(doc(db, "users", activeUid, "savedRecipes", id));
      showToast("Recipe removed from saved", "🗑️");
    } catch (error) {
      console.error("[Firestore SavedRecipes] Failed to delete recipe:", error);
      showToast("Failed to remove recipe from saved.", "❌");
    }
  };

  // Stats
  const expiringSoonCount = fridgeItems.filter((item) => {
    const { status } = getExpiryInfo(item.expiryDate);
    return status === "expiring_soon" || status === "expired";
  }).length;

  return (
    <FridgeContext.Provider
      value={{
        fridgeItems,
        shoppingList,
        savedRecipes,
        toast,
        addItemToFridge,
        removeItemFromFridge,
        addToShoppingList,
        addSingleShoppingItem,
        toggleShoppingItem,
        removeShoppingItem,
        clearCompletedShopping,
        moveShoppingItemToFridge,
        saveNewRecipe,
        deleteSavedRecipe,
        getExpiryInfo,
        expiringSoonCount,
        showToast,
      }}
    >
      {children}
    </FridgeContext.Provider>
  );
}
