import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../Components/button";
import { useAppContext } from "../Context/AppContext";

const Login = () => {
  const { user, registerUser, loginUser } = useAppContext();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" or "register"
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({});
  const [registerWarning, setRegisterWarning] = useState("");
  const [registerSuccessOpen, setRegisterSuccessOpen] = useState(false);

  

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setRegisterWarning("");

    // mark all fields as touched so inline warnings appear
    const newTouched = { email: true, password: true };
    if (mode === "register") {
      newTouched.name = true;
      newTouched.lastName = true;
    }
    setTouched(newTouched);

    // basic field validation
    if (!email || !password || (mode === "register" && !name)) {
      setError("Por favor completa los campos obligatorios.");
      return;
    }

    // handle register vs login with proper error reporting
    (async () => {
      try {
        if (mode === "register") {
          // pre-backend check: if there's already a persisted user with same email, show warning
          try {
            const raw = localStorage.getItem("sernachat:user");
            if (raw) {
              const existing = JSON.parse(raw);
              if (existing && existing.email && existing.email.toLowerCase() === email.toLowerCase()) {
                setRegisterWarning(`Ya existe una cuenta con el correo ${email}`);
                return;
              }
            }
          } catch (e) {
            // ignore parsing errors
          }

          // create the user via context helper (may persist and set context)
          await registerUser({ name, lastName, email, password });

          // show success modal, switch to login view and then redirect to home after a short loading animation
          setMode("login");
          setRegisterSuccessOpen(true);
          // clear inputs
          setName("");
          setLastName("");
          setEmail("");
          setPassword("");

          setTimeout(() => {
            setRegisterSuccessOpen(false);
            // volver a la vista de iniciar sesión
            navigate("/login");
          }, 1800);
        } else {
          await loginUser({ email, password });
          // on successful login, navigate to loading as before
          navigate("/loading");
        }
      } catch (err) {
        // show error message in red
        const msg = err?.message || "Credenciales inválidas. Revisa correo o contraseña.";
        setError(msg);
      }
    })();
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#071018] p-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-[352px] text-gray-700 dark:text-gray-200 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0b1720]"
      >
        <div className="w-full text-center">
          <p className="text-2xl font-medium m-auto text-center">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </p>

          {/* register warning (non-popup) */}
          {mode === "register" && registerWarning && (
            <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded w-full">
              {registerWarning}
            </div>
          )}

          {/* global error (login/register failures) */}
          {error && <div className="mt-2 text-sm text-red-600 w-full">{error}</div>}
        </div>

        {mode === "register" && (
          <>
            <div className="w-full">
              <label className="text-sm mb-1 block">Nombre</label>
              <input
                onChange={(e) => setName(e.target.value)}
                value={name}
                placeholder="Escribe tu nombre"
                className="border border-gray-200 rounded w-full p-2 mt-1 outline-indigo-500 bg-white dark:bg-[#071018] text-gray-700 dark:text-gray-200"
                type="text"
                required={mode === "register"}
                onBlur={() => handleBlur('name')}
              />
              {touched.name && !name && (
                <div className="text-[11px] text-red-600 mt-1">Este campo es obligatorio</div>
              )}
            </div>
            <div className="w-full">
              <label className="text-sm mb-1 block">Apellido</label>
              <input
                onChange={(e) => setLastName(e.target.value)}
                value={lastName}
                placeholder="Escribe tu apellido"
                className="border border-gray-200 rounded w-full p-2 mt-1 outline-indigo-500 bg-white dark:bg-[#071018] text-gray-700 dark:text-gray-200"
                type="text"
                required={mode === "register"}
                onBlur={() => handleBlur('lastName')}
              />
              {touched.lastName && !lastName && (
                <div className="text-[11px] text-red-600 mt-1">Este campo es obligatorio</div>
              )}
            </div>
          </>
        )}

        <div className="w-full ">
          <label className="text-sm mb-1 block">Correo electrónico</label>
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            placeholder="tucorreo@ejemplo.com"
            className="border border-gray-200 rounded w-full p-2 mt-1 outline-indigo-500 bg-white dark:bg-[#071018] text-gray-700 dark:text-gray-200"
            type="email"
            required
            onBlur={() => handleBlur('email')}
          />
          {touched.email && !email && (
            <div className="text-[11px] text-red-600 mt-1">Correo es obligatorio</div>
          )}
        </div>
        <div className="w-full ">
          <label className="text-sm mb-1 block">Contraseña</label>
          <input
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            placeholder="Escribe tu contraseña"
            className="border border-gray-200 rounded w-full p-2 mt-1 outline-indigo-500 bg-white dark:bg-[#071018] text-gray-700 dark:text-gray-200"
            type="password"
            required
            onBlur={() => handleBlur('password')}
          />
          {touched.password && !password && (
            <div className="text-[11px] text-red-600 mt-1">Contraseña es obligatoria</div>
          )}
        </div>

        <div className="w-full text-sm text-gray-600 dark:text-gray-300">
          {mode === "register" ? (
            <>
              ¿Ya tienes una cuenta?{" "}
              <button type="button" onClick={() => setMode("login")} className="text-indigo-500 hover:underline">
                Inicia sesión
              </button>
            </>
          ) : (
            <>
              ¿No tienes una cuenta?{" "}
              <button type="button" onClick={() => setMode("register")} className="text-indigo-500 hover:underline">
                Crear cuenta
              </button>
            </>
          )}
        </div>

        <div className="w-full">
          <Button type="submit">{mode === "register" ? "Crear cuenta" : "Iniciar sesión"}</Button>
        </div>

        {/* Register success modal (non-blocking) */}
        {registerSuccessOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white dark:bg-[#0E1720] rounded-lg p-6 shadow-2xl border border-gray-200 dark:border-white/10 w-[90%] max-w-sm text-center">
              <h3 className="font-semibold mb-2">Cuenta creada exitosamente</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Volviendo al Inicio...</p>
              <div className="flex items-center justify-center">
                <svg
                  className="h-8 w-8"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="40 24"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 12 12"
                      to="-360 12 12"
                      dur="0.9s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
              </div>
            </div>
          </div>
        )}

        <div className="w-full text-xs text-gray-500 dark:text-gray-400 text-center">
          Al iniciar sesión aceptas los términos y condiciones.
        </div>

        {/* Mostrar estado actual del usuario (si ya hay uno en contexto) */}
        {user && (
          <div className="w-full mt-2 text-sm text-gray-700 dark:text-gray-200 border-t pt-3">
            <div>Sesión actual: <strong>{user.name}</strong></div>
            <div>Rol: <strong>{user.role}</strong></div>
            <div>Admin: <strong>{user.isAdmin ? "Sí" : "No"}</strong></div>
            <div>Moderación: <strong>{user.isModerator ? "Sí" : "No"}</strong></div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Login;
