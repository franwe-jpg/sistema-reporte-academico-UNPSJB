// src/components/UserMenu.tsx
import { Dropdown } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

export default function UserMenu() {
  const { logout, roles, token, userName } = useAuth();

  if (!token) return null;

  const mainRole = roles.includes("admin")
    ? "Administrador"
    : roles[0]
    ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1)
    : "Sin rol";

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="light" id="user-menu">
        <i className="bi bi-person-circle me-2"></i>
        ¡Hola {userName || "Usuario actual"}!
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Header>
          <div>
            <strong>¡Hola {userName || "Usuario actual"}!</strong>
          </div>
          <div>
            <strong>Rol:</strong> {mainRole}
          </div>
        </Dropdown.Header>

        <Dropdown.Divider />

        <Dropdown.Item onClick={logout} className="text-danger">
          <i className="bi bi-box-arrow-right me-2"></i>
          Cerrar sesión
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
