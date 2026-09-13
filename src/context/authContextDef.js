import { createContext } from "react";

export const AuthContext = createContext({
  user: null,
  uid: null,
  loading: true,
  error: null,
});
