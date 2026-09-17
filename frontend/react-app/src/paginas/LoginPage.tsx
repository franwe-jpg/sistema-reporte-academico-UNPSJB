import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiFetch from "../api/client.ts";
import fondoLogin from "../assets/fondoLogin.jpg";
import "../styles/loginPage.css";
import BotonReiniciarDemo from "../componentes/BotonReiniciarDemo";

type Modo = "login" | "alta" | "recupero";

export default function LoginPage() {
  const [modo, setModo] = useState<Modo>("login");

  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoApellido, setNuevoApellido] = useState("");
  const [nuevoDni, setNuevoDni] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");

  const [recDni, setRecDni] = useState("");
  const [recPasswordVieja, setRecPasswordVieja] = useState("");
  const [recPasswordNueva, setRecPasswordNueva] = useState("");
  // El tercer campo recién aparece cuando los dos primeros están completos.
  const [recPasoDos, setRecPasoDos] = useState(false);
  const [recOk, setRecOk] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const cambiarModo = (siguiente: Modo) => {
    setModo(siguiente);
    setErrorMsg("");
    setRecOk("");
    setRecPasoDos(false);
  };

  /**
   * Con el token ya guardado, lee los permisos, arma la sesión y manda a la
   * persona al panel que le corresponde. Lo usan tanto el ingreso como el alta.
   */
  const iniciarSesionConToken = async (token: string) => {
    localStorage.setItem("token", token);

    const permRes = await apiFetch("/seguridad/me/permissions");
    if (!permRes.ok) {
      setErrorMsg("No se pudieron obtener los permisos");
      return;
    }

    const permData = await permRes.json();
    const roles: string[] = permData.roles ?? [];

    const apellido: string = permData.apellido ?? "";
    const nombres: string = permData.nombre ?? permData.nombres ?? "";
    const userName = `${nombres} ${apellido}`.trim();

    login(token, roles, userName);

    if (roles.includes("docente")) navigate("/docente");
    else if (roles.includes("alumno")) navigate("/alumno");
    else if (roles.includes("departamento")) navigate("/departamento");
    else navigate("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setEnviando(true);

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

      await iniciarSesionConToken(token);
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error al intentar iniciar sesión");
    } finally {
      setEnviando(false);
    }
  };

  const handleAlta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setEnviando(true);

    try {
      const res = await apiFetch("/auth/registro", {
        method: "POST",
        body: JSON.stringify({
          nombre: nuevoNombre.trim(),
          apellido: nuevoApellido.trim(),
          dni: Number(nuevoDni),
          password: nuevaPassword,
        }),
      });

      if (res.status === 409) {
        setErrorMsg("Ya existe una persona registrada con ese DNI");
        return;
      }

      if (!res.ok) {
        setErrorMsg("No se pudo crear el usuario. Revisá los datos e intentá de nuevo.");
        return;
      }

      const data = await res.json();
      await iniciarSesionConToken(data.access_token as string);
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error al crear el usuario");
    } finally {
      setEnviando(false);
    }
  };

  const handleRecuperoPaso1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setRecPasoDos(true);
  };

  const handleRecupero = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setEnviando(true);

    try {
      const res = await apiFetch("/auth/recuperar-password", {
        method: "POST",
        body: JSON.stringify({
          dni: Number(recDni),
          password_recordada: recPasswordVieja,
          password_nueva: recPasswordNueva,
        }),
      });

      if (res.status === 404) {
        setErrorMsg("No encontramos una persona registrada con ese DNI");
        return;
      }

      if (!res.ok) {
        setErrorMsg("No se pudo cambiar la contraseña. Intentá de nuevo.");
        return;
      }

      const data = await res.json();
      setRecOk(`Contraseña actualizada para ${data.nombre} ${data.apellido}. Ya podés iniciar sesión.`);
      setDni(recDni);
      setPassword("");
      setRecPasswordVieja("");
      setRecPasswordNueva("");
      setRecPasoDos(false);
      setModo("login");
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error al cambiar la contraseña");
    } finally {
      setEnviando(false);
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
        {modo === "login" && (
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

            {recOk && <p className="text-success">{recOk}</p>}
            {errorMsg && <p className="text-danger">{errorMsg}</p>}

            <button
              className="btn btn-primary w-100 mt-3"
              type="submit"
              disabled={enviando}
            >
              {enviando ? "Ingresando..." : "Ingresar"}
            </button>

            <div className="text-center mt-3" style={{ fontSize: "0.9rem" }}>
              <button
                type="button"
                className="btn btn-link p-0 me-2 align-baseline"
                onClick={() => cambiarModo("alta")}
              >
                Solicitar alta de nuevo usuario
              </button>
              |
              <button
                type="button"
                className="btn btn-link p-0 ms-2 align-baseline"
                onClick={() => cambiarModo("recupero")}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <BotonReiniciarDemo />
          </form>
        )}

        {modo === "alta" && (
          <form
            className="p-4 border rounded shadow bg-white"
            onSubmit={handleAlta}
          >
            <h2 className="text-center mb-2">Alta de usuario</h2>
            <h6 className="text-center mb-4 text-muted">
              Se crea con perfil de alumno
            </h6>

            <div className="mb-3">
              <label>Nombre</label>
              <input
                type="text"
                className="form-control"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="ej: Juan"
                minLength={2}
                required
              />
            </div>

            <div className="mb-3">
              <label>Apellido</label>
              <input
                type="text"
                className="form-control"
                value={nuevoApellido}
                onChange={(e) => setNuevoApellido(e.target.value)}
                placeholder="ej: Pérez"
                minLength={2}
                required
              />
            </div>

            <div className="mb-3">
              <label>DNI</label>
              <input
                type="number"
                className="form-control"
                value={nuevoDni}
                onChange={(e) => setNuevoDni(e.target.value)}
                placeholder="ej: 40123456"
                required
              />
            </div>

            <div className="mb-3">
              <label>Contraseña</label>
              <input
                type="password"
                className="form-control"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="mínimo 4 caracteres"
                minLength={4}
                required
              />
            </div>

            {errorMsg && <p className="text-danger">{errorMsg}</p>}

            <button
              className="btn btn-primary w-100 mt-3"
              type="submit"
              disabled={enviando}
            >
              {enviando ? "Creando..." : "Crear usuario e ingresar"}
            </button>

            <div className="text-center mt-3" style={{ fontSize: "0.9rem" }}>
              <button
                type="button"
                className="btn btn-link p-0 align-baseline"
                onClick={() => cambiarModo("login")}
              >
                Volver a iniciar sesión
              </button>
            </div>
          </form>
        )}

        {modo === "recupero" && (
          <form
            className="p-4 border rounded shadow bg-white"
            onSubmit={recPasoDos ? handleRecupero : handleRecuperoPaso1}
          >
            <h2 className="text-center mb-2">Recuperar contraseña</h2>
            <h6 className="text-center mb-4 text-muted">
              Sistema de Analisis Academico
            </h6>

            <div className="mb-3">
              <label>DNI</label>
              <input
                type="number"
                className="form-control"
                value={recDni}
                onChange={(e) => setRecDni(e.target.value)}
                placeholder="ej: 40123456"
                disabled={recPasoDos}
                required
              />
            </div>

            <div className="mb-3">
              <label>Última contraseña que recuerdes</label>
              <input
                type="password"
                className="form-control"
                value={recPasswordVieja}
                onChange={(e) => setRecPasswordVieja(e.target.value)}
                placeholder="la que tengas presente"
                disabled={recPasoDos}
                required
              />
            </div>

            {recPasoDos && (
              <div className="mb-3">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={recPasswordNueva}
                  onChange={(e) => setRecPasswordNueva(e.target.value)}
                  placeholder="la que quieras usar de ahora en más"
                  autoFocus
                  required
                />
              </div>
            )}

            {errorMsg && <p className="text-danger">{errorMsg}</p>}

            <button
              className="btn btn-primary w-100 mt-3"
              type="submit"
              disabled={enviando}
            >
              {recPasoDos
                ? enviando
                  ? "Guardando..."
                  : "Guardar nueva contraseña"
                : "Continuar"}
            </button>

            <div className="text-center mt-3" style={{ fontSize: "0.9rem" }}>
              <button
                type="button"
                className="btn btn-link p-0 align-baseline"
                onClick={() => cambiarModo("login")}
              >
                Volver a iniciar sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
