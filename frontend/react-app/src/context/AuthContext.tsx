import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  token: string | null;
  roles: string[];
  userName: string | null;
  login: (token: string, roles: string[], userName: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  roles: [],
  userName: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  const [roles, setRoles] = useState<string[]>(() => {
    const stored = localStorage.getItem("roles");
    return stored ? JSON.parse(stored) : [];
  });

  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem("userName");
  });

  function login(newToken: string, newRoles: string[], newUserName: string) {
    setToken(newToken);
    setRoles(newRoles);
    setUserName(newUserName);

    localStorage.setItem("token", newToken);
    localStorage.setItem("roles", JSON.stringify(newRoles));
    localStorage.setItem("userName", newUserName);
  }

  const logout = () => {
    setToken(null);
    setRoles([]);
    setUserName(null);
    localStorage.removeItem("token");
    localStorage.removeItem("roles");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ token, roles, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
