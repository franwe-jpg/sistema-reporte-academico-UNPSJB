import { Link, Outlet } from "react-router-dom";
import { Container, Col, Navbar, Row, Card, Nav } from "react-bootstrap";
import "../styles/Layout.css";
import logoUnpsjb from "../assets/escudo_tranparente_sinletras.png";
import { useAuth } from "../context/AuthContext";
import UserMenu from "../componentes/UserMenu";

export default function LayoutHome() {
  const { roles = [], token } = useAuth();

  // Permisos: admin siempre entra
  const can = (role: string) => {
    return roles.includes("admin") || roles.includes(role);
  };

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
          <Nav className="me-auto"></Nav>

          <div className="ms-auto me-3">
            {!token ? (
              <Link to="/login" className="btn btn-outline-light">
                Iniciar sesión
              </Link>
            ) : (
              <UserMenu />
            )}
          </div>
        </Navbar.Collapse>
      </Navbar>

      <main className="content flex-grow-1 pb-5">
        <Container className="py-4">
          <Row>
            <Col lg={9} md={10} className="mx-auto">
              <Card className="border rounded shadow-sm bg-white text-center">
                <Card.Header as="h4" className="bg-primary text-white">
                  SIstema de Análisis Académico
                </Card.Header>

                <Card.Body className="p-4 p-md-5">
                  <h2>¡Bienvenido!</h2>
                  <hr className="my-4" />

                  {token ? (
                    <Row className="text-center g-4">
                      {can("alumno") && (
                        <Col md={4}>
                          <Card
                            as={Link}
                            to="/alumno"
                            className="border rounded shadow-sm bg-white text-center h-100 text-decoration-none text-dark"
                          >
                            <Card.Body className="p-4 d-flex flex-column justify-content-center align-items-center">
                              <i className="bi bi-mortarboard-fill home-icon text-primary"></i>
                              <h5 className="mt-3 mb-0">Alumno</h5>
                            </Card.Body>
                          </Card>
                        </Col>
                      )}

                      {can("docente") && (
                        <Col md={4}>
                          <Card
                            as={Link}
                            to="/docente"
                            className="border rounded shadow-sm bg-white text-center h-100 text-decoration-none text-dark"
                          >
                            <Card.Body className="p-4 d-flex flex-column justify-content-center align-items-center">
                              <i className="bi bi-briefcase-fill home-icon text-primary"></i>
                              <h5 className="mt-3 mb-0">Docente</h5>
                            </Card.Body>
                          </Card>
                        </Col>
                      )}

                      {can("departamento") && (
                        <Col md={4}>
                          <Card
                            as={Link}
                            to="/departamento"
                            className="border rounded shadow-sm bg-white text-center h-100 text-decoration-none text-dark"
                          >
                            <Card.Body className="p-4 d-flex flex-column justify-content-center align-items-center">
                              <i className="bi bi-building home-icon text-primary"></i>
                              <h5 className="mt-3 mb-0">Departamento</h5>
                            </Card.Body>
                          </Card>
                        </Col>
                      )}
                    </Row>
                  ) : (
                    <p className="mt-4 text-muted">
                      Inicia sesión para acceder a tu panel.
                    </p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Outlet />
        </Container>
      </main>

      <footer className="footer bg-primary text-white text-center p-3 mb-0 fixed-bottom">
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
