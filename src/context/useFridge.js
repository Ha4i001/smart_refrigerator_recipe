import { useContext } from "react";
import { FridgeContext } from "./fridgeContextDef";

export const useFridge = () => useContext(FridgeContext);
