import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiFetch from "../api/client.ts";
import fondoLogin from "../assets/fondoLogin.jpg";
import "../styles/loginPage.css";

export default function LoginPage() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ dni: Number(dni), password }),
      });

      if (!res.ok) {
        setErrorMsg("Credenciales incorrectas");
        return;
      }

      const data = await res.json();
      const token = data.access_token as string;

      if (!token) {
        setErrorMsg("Respuesta inválida del servidor");
        return;
      }

      localStorage.setItem("token", token);

      const permRes = await apiFetch("/seguridad/me/permissions");
      if (!permRes.ok) {
        setErrorMsg("No se pudieron obtener los permisos");
        return;
      }

      const permData = await permRes.json();
      const roles: string[] = permData.roles ?? [];

      const apellido: string = permData.apellido ?? "";
      const nombres: string = permData.nombres ?? "";
      const userName = `${nombres} ${apellido}`.trim();

      login(token, roles, userName);

      if (roles.includes("docente")) navigate("/docente");
      else if (roles.includes("alumno")) navigate("/alumno");
      else if (roles.includes("departamento")) navigate("/departamento");
      else navigate("/");
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error al intentar iniciar sesión");
    }
  };

  return (
    <div
      className="login-background d-flex justify-content-center align-items-center"
      style={{ backgroundImage: `url(${fondoLogin})` }}
    >
      <div className="login-overlay" />

      <div
        className={
          "login-form-container " +
          (animate ? "login-form-animate" : "login-form-start")
        }
      >
        <form
          className="p-4 border rounded shadow bg-white"
          onSubmit={handleSubmit}
        >
          <h2 className="text-center mb-4">Iniciar sesión</h2>
          <h6 className="text-center mb-4">Sistema de Analisis Academico</h6>

          <div className="mb-3">
            <label>Usuario</label>
            <input
              type="text"
              className="form-control"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="ej: su DNI"
              required
            />
          </div>

          <div className="mb-3">
            <label>Contraseña</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ej: 1234"
              required
            />
          </div>

          {errorMsg && <p className="text-danger">{errorMsg}</p>}

          <button className="btn btn-primary w-100 mt-3" type="submit">
            Ingresar
          </button>

          <div className="text-center mt-3" style={{ fontSize: "0.9rem" }}>
            <a href="#" className="me-2">
              Solicitar alta de nuevo usuario
            </a>
            |
            <a href="#" className="ms-2">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
