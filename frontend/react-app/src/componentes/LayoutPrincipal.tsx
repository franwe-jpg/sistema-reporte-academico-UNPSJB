import { Link, Outlet, NavLink } from "react-router-dom";
import { Container, Navbar, Nav } from "react-bootstrap";
import "../styles/Layout.css";
import logoUnpsjb from "../assets/escudo_tranparente_sinletras.png";
import { useAuth } from "../context/AuthContext";
import UserMenu from "../componentes/UserMenu";

type NavLinkItem = {
  to: string;
  label: string;
};

type Props = {
  links: NavLinkItem[];
  // Rol necesario para acceder a esta sección (alumno, docente, departamento, etc.)
  requiredRole?: string;
};

export default function LayoutPrincipal({ links, requiredRole }: Props) {
  const { roles = [], token } = useAuth();

  // Permisos: admin siempre tiene acceso
  const can = (role: string) => roles.includes("admin") || roles.includes(role);

  // Si no está logueado
  if (!token) {
    return (
      <div className="mt-5 text-center">
        <h4>No autorizado</h4>
        <p>Iniciá sesión para acceder.</p>
      </div>
    );
  }

  // Si hay un rol requerido y el usuario no lo tiene (ni es admin)
  if (requiredRole && !can(requiredRole)) {
    return (
      <div className="mt-5 text-center">
        <h4>No autorizado</h4>
        <p>
          Solo usuarios con rol de <strong>{requiredRole}</strong> o{" "}
          <strong>admin</strong> pueden ver esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="layout">
      <Navbar
        bg="primary"
        variant="dark"
        expand="lg"
        sticky="top"
        className="shadow-sm"
      >
        <Navbar.Brand
          as={Link}
          to="/"
          className="ms-3 d-flex flex-column align-items-center text-decoration-none"
        >
          <div className="logo-oval-container">
            <img src={logoUnpsjb} className="logo-img" alt="Ir al inicio" />
          </div>

          <span className="logo-text mt-1">Inicio</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {links.map((link) => (
              <Nav.Link
                as={NavLink}
                to={link.to}
                key={link.to}
                end={link.to === "/"}
              >
                {link.label}
              </Nav.Link>
            ))}
          </Nav>

          <div className="ms-auto me-3">
            <UserMenu />
          </div>
        </Navbar.Collapse>
      </Navbar>

      <main className="content">
        <Container className="mt-4 text-center">
          <Outlet />
        </Container>
      </main>

      <footer className="footer bg-primary text-white text-center p-3 mb-0">
        <div className="d-flex justify-content-center align-items-center gap-3">
          <span>&copy; 2025 Sistema de Analisis Academico</span>
          
          {/* Enlace de correo */}
          <a 
            href="mailto:ingenieria.trelew@gmail.com" 
            className="text-white text-decoration-none d-flex align-items-center"
            title="Enviar consulta"
          >
            <i className="bi bi-envelope-fill fs-5"></i>
          </a>
        </div>
      </footer>
    </div>
  );
}
