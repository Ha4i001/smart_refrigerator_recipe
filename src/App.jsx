import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { FridgeProvider } from "./context/FridgeContext";
import Navbar from "./components/Navbar";
import FloatingElements from "./components/FloatingElements";
import Toast from "./components/Toast";

import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Fridge from "./pages/Fridge";
import Recipes from "./pages/Recipes";
import SavedRecipes from "./pages/SavedRecipes";
import ShoppingList from "./pages/ShoppingList";

function App() {
  return (
    <AuthProvider>
      <FridgeProvider>
        <BrowserRouter>
        <div className="app-container">
          <FloatingElements />
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/scan" element={<Scan />} />
              <Route path="/fridge" element={<Fridge />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/saved" element={<SavedRecipes />} />
              <Route path="/shopping-list" element={<ShoppingList />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Toast />
        </div>
      </BrowserRouter>
    </FridgeProvider>
    </AuthProvider>
  );
}

export default App;
