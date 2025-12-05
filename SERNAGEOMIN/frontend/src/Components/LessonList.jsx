import React, { useState, useEffect, useRef } from "react";
import LessonIcon from "/src/assets/lesson_icon.svg";
import CautionIcon from "/src/assets/caution_icon.svg";
import SearchBar from "./SearchBar";
import RefreshIcon from "/src/assets/refresh_icon.svg";
import CloseIcon from "/src/assets/close_icon.svg";
import BinIcon from "/src/assets/bin_icon.svg"; // usar icono existente proporcionado
import ErrorAlertIcon from "/src/assets/error_alert.svg";
import Button from "./button";
import { useAppContext } from "../Context/AppContext";

// Live lessons now provided by global context (seeding handled elsewhere)
const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "lesson-" + Math.random().toString(36).slice(2) + Date.now();

// very small valid PDF with a single line of text
const createDummyPdfBlob = (title = "Lección de prueba") => {
  const pdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 70 >>\nstream\nBT /F1 12 Tf 30 100 Td (${title.replace(/[()]/g, '')}) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000061 00000 n \n0000000111 00000 n \n0000000278 00000 n \n0000000402 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n500\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
};

// --- ADICIONES: LESSONS_KEY, baseLessons y estados locales para integración n8n ---
const LESSONS_KEY = "sernachat:lessons";

// Dummy lessons base (sin ids, se asignarán UUIDs al inicializar)
const baseLessons = [
  {
    name: "Geología aplicada al yacimiento",
    approvedBy: { name: "María Pérez", date: new Date().toISOString() },
    filename: "geologia_yacimiento.pdf",
  },
  {
    name: "Optimización de perforación",
    approvedBy: { name: "Juan Rodríguez", date: new Date(Date.now() - 86400000).toISOString() },
    filename: "optimizacion_perforacion.pdf",
  },
  {
    name: "Seguridad minera básica",
    approvedBy: { name: "Ana Gómez", date: new Date(Date.now() - 3 * 86400000).toISOString() },
    filename: "seguridad_minera_basica.pdf",
  },
  {
    name: "Procesamiento de minerales: Fundamentos",
    approvedBy: { name: "Luis Herrera", date: new Date(Date.now() - 5 * 86400000).toISOString() },
    filename: "procesamiento_minerales_fundamentos.pdf",
  },
  {
    name: "Gestión ambiental en minería",
    approvedBy: { name: "Cecilia Romero", date: new Date(Date.now() - 7 * 86400000).toISOString() },
    filename: "gestion_ambiental_mineria.pdf",
  },
  {
    name: "Ventilación de minas subterráneas",
    approvedBy: { name: "Pedro Sánchez", date: new Date(Date.now() - 9 * 86400000).toISOString() },
    filename: "ventilacion_minas_subterraneas.pdf",
  },
  {
    name: "Evaluación económica de proyectos mineros",
    approvedBy: { name: "Carolina Díaz", date: new Date(Date.now() - 11 * 86400000).toISOString() },
    filename: "evaluacion_economica_proyectos.pdf",
  },
  {
    name: "Minería sustentable y energías renovables",
    approvedBy: { name: "Jorge Molina", date: new Date(Date.now() - 13 * 86400000).toISOString() },
    filename: "mineria_sustentable_energias.pdf",
  },
  {
    name: "Control de polvo y emisiones",
    approvedBy: { name: "Gabriela Torres", date: new Date(Date.now() - 15 * 86400000).toISOString() },
    filename: "control_polvo_emisiones.pdf",
  },
  {
    name: "Instrumentación y monitoreo geotécnico",
    approvedBy: { name: "Ricardo Fuentes", date: new Date(Date.now() - 17 * 86400000).toISOString() },
    filename: "instrumentacion_monitoreo_geotecnico.pdf",
  },
  {
    name: "Mantenimiento predictivo de equipos pesados",
    approvedBy: { name: "Silvia Navarro", date: new Date(Date.now() - 19 * 86400000).toISOString() },
    filename: "mantenimiento_predictivo_equipos.pdf",
  },
];
// --- fin adiciones ---

const LessonList = () => {
  // usar solo theme desde el contexto; manejar lessons localmente para la sincronización con n8n
  const { theme, user, isAdmin } = useAppContext();
  const [lessons, setLessons] = useState([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const panelRef = useRef(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerFilename, setViewerFilename] = useState("");
  const [deletingLessonId, setDeletingLessonId] = useState(null); // id en proceso de borrado
  const [lessonPendingDeletion, setLessonPendingDeletion] = useState(null); // lección seleccionada para confirmación

  // estados necesarios para la integración n8n / sincronización remota
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorType, setErrorType] = useState(""); // "upload" o "create"

  // lessons now update live via context; no local initialization here
  // n8n webhook endpoints (override with Vite env variables)
    const N8N_LESSONS_WEBHOOK = 
      import.meta.env.VITE_N8N_LESSONS_WEBHOOK || "http://localhost:5678/webhook-test/lessons";
    
    const N8N_LESSON_BY_ID_WEBHOOK = 
      import.meta.env.VITE_N8N_LESSON_BY_ID_WEBHOOK || "http://localhost:5678/webhook-test/lessonsid";

    // webhook para subir lecciones (acepta multipart/form-data)
    const N8N_LESSON_UPLOAD_WEBHOOK =
      import.meta.env.VITE_N8N_LESSON_UPLOAD_WEBHOOK || "http://localhost:5678/webhook-test/lesson_subir";
  
    // Añadir el nuevo webhook después de los otros
    const N8N_LESSON_CREATE_WEBHOOK = 
      import.meta.env.VITE_N8N_LESSON_CREATE_WEBHOOK || "http://localhost:5678/webhook-test/lesson_subir_nuevo";

    // Webhook para acciones de lecciones (eliminar, etc.)
    const N8N_LESSON_ACTIONS_WEBHOOK =
      import.meta.env.VITE_N8N_LESSON_ACTIONS_WEBHOOK || "http://localhost:5678/webhook-test/lessonsid";
  
    // initialize lessons with UUID persistence
    useEffect(() => {
      // load from cache first (fast UI), then try to refresh from n8n
      const stored = localStorage.getItem(LESSONS_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const patched = parsed.map((l) => ({ ...l, id: l.id || genId() }));
            setLessons(patched);
          } else {
            // seed dummy lessons if cache is empty array or invalid
            const withIds = baseLessons.map((l) => ({ ...l, id: genId() }));
            setLessons(withIds);
            localStorage.setItem(LESSONS_KEY, JSON.stringify(withIds));
          }
        } catch (e) {
          console.warn("Failed to parse lessons", e);
          const withIds = baseLessons.map((l) => ({ ...l, id: genId() }));
          setLessons(withIds);
          localStorage.setItem(LESSONS_KEY, JSON.stringify(withIds));
        }
      } else {
        const withIds = baseLessons.map((l) => ({ ...l, id: genId() }));
        setLessons(withIds);
        localStorage.setItem(LESSONS_KEY, JSON.stringify(withIds));
      }

      // attempt to fetch authoritative list from n8n webhook
      fetchLessonsFromN8N();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  
    const fetchLessonsFromN8N = async () => {
      setRemoteLoading(true);
      try {
        const res = await fetch(N8N_LESSONS_WEBHOOK, { method: "GET" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const remote = await res.json();
        if (!Array.isArray(remote)) {
          console.warn("n8n returned non-array payload for lessons:", remote);
          setRemoteLoading(false);
          return;
        }
  
        // Normalize remote entries: solo necesitamos id, título, filename y datos de aprobación
        const normalized = remote.map((r) => ({
          id: r._id || r.id || genId(),
          name: (r.titulo || r.title || r.name || r.nombre || "").trim() || "Sin nombre",
          filename: r.filename || r.fileName || r.archivoNombre || "documento.pdf",
          approvedBy: {
            name: r.admin || (r.approvedBy && (r.approvedBy.name || r.approvedBy.usuario)) || null,
            date:
              r.fecha_aprobacion ||
              (r.approvedBy && (r.approvedBy.date || r.approvedBy.fecha)) ||
              r.approvedAt ||
              null,
          },
          // conservar resto por si se necesita (fileUrl, base64, etc.)
          ...r,
        }));
  
        setLessons(normalized);
        localStorage.setItem(LESSONS_KEY, JSON.stringify(normalized));
      } catch (err) {
        console.error("Failed to fetch lessons from n8n:", err);
      } finally {
        setRemoteLoading(false);
      }
    };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!open) return;
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest("[data-lesson-toggle]")) return;
      // close on outside click
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = lessons.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.filename.toLowerCase().includes(search.toLowerCase())
  );

  const performDeleteLesson = async (lesson) => {
    if (!lesson) return;
    try {
      setDeletingLessonId(lesson.id);
      // Enviar acción de eliminación al webhook
      const payload = {
        action: "eliminar",
        lessonId: lesson.id,
        userId: user?._id ?? "anon",
      };
      await fetch(N8N_LESSON_ACTIONS_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Error al enviar acción de eliminar lección:", err);
    } finally {
      setDeletingLessonId(null);
    }
    setLessons((prev) => {
      const updated = prev.filter((l) => l.id !== lesson.id);
      try { localStorage.setItem(LESSONS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const requestDeleteLesson = (lesson) => {
    if (!user || user.role !== "admin") return;
    setLessonPendingDeletion(lesson);
  };

  // submission handlers store JSON for later backend processing
  // payload: objeto construido en el modal; file: File object (pdf)
  const handleUploadSubmit = async (payload, file) => {
    const key = "sernachat:lesson_submissions";
    // Guardado local como fallback inmediato
    try {
      const stored = localStorage.getItem(key);
      const arr = stored ? JSON.parse(stored) : [];
      arr.push(payload);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (err) {
      console.warn("No se pudo guardar localmente la subida:", err);
    }

    setRemoteLoading(true);
    try {
      // convertir a base64 si hay archivo
      const fileToBase64 = (f) =>
        new Promise((resolve, reject) => {
          if (!f) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => {
            // reader.result => "data:application/pdf;base64,AAAA..."
            const parts = String(reader.result).split(",");
            resolve(parts[1] || null);
          };
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(f);
        });

      const base64 = file ? await fileToBase64(file) : null;

      // construir payload JSON para n8n
      const body = {
        id: payload.id,
        type: payload.type,
        metadata: payload.metadata || {},
        filename: file ? file.name : payload.metadata?.archivoNombre || null,
        base64: base64, // null si no hay archivo
        usuario: user?.name || "Anónimo",
        userId: user?._id ?? "anon",
      };

      const res = await fetch(N8N_LESSON_UPLOAD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const result = await res.json().catch(() => null);
      console.log("Respuesta subida n8n (base64):", result);
      setSuccessMessage("Lección guardada correctamente, esperando aprobación del administrador");
      setSuccessOpen(true);
    } catch (err) {
      console.error("Error al subir lección a n8n (base64):", err);
      setErrorMessage("Ocurrió un error al subir la lección. Por favor, intenta de nuevo.");
      setErrorType("upload");
      setErrorOpen(true);
    } finally {
      setRemoteLoading(false);
      setUploadOpen(false);
    }
  };
  
  const handleCreateSubmit = async (data) => {
    const key = "sernachat:lesson_creations";
    // Guardado local como fallback
    try {
      const stored = localStorage.getItem(key);
      const arr = stored ? JSON.parse(stored) : [];
      arr.push(data);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (err) {
      console.warn("No se pudo guardar localmente la creación:", err);
    }

    setRemoteLoading(true);
    try {
      // Preparar payload para el webhook
      const payload = {
        id: data.id,
        metadata: {
          titulo: data.metadata.titulo,
          descripcion: data.metadata.descripcion,
          categoria: data.metadata.categoria,
          fecha: data.metadata.fecha,
          autor: data.metadata.autor,
          departamento: data.metadata.departamento,
          proyecto: data.metadata.proyecto,
          palabrasClave: data.metadata.palabrasClave,
          autores: data.metadata.autores,
          resumen: data.metadata.resumen,
          introduccion: data.metadata.introduccion,
          desarrollo: data.metadata.desarrollo,
          conclusion: data.metadata.conclusion,
          referencias: data.metadata.referencias
        },
        usuario: user?.name || "Anónimo",
        userId: user?._id ?? "anon",
      };

      const res = await fetch(N8N_LESSON_CREATE_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      
      const result = await res.json();
      console.log("Respuesta creación n8n:", result);
      setSuccessMessage("Lección creada correctamente, esperando aprobación del administrador");
      setSuccessOpen(true);
      
      // Actualizar lista de lecciones
      fetchLessonsFromN8N();
      
    } catch (err) {
      console.error("Error al crear lección en n8n:", err);
      setErrorMessage("Ocurrió un error al crear la lección. Por favor, intenta de nuevo.");
      setErrorType("create");
      setErrorOpen(true);
    } finally {
      setRemoteLoading(false);
      setCreateOpen(false);
    }
  };
  
  // openInViewer: si true abre el PDF en el viewer, si false fuerza descarga
  const handleLessonClick = async (lesson, e, openInViewer = true) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    setRemoteLoading(true);
    try {
      const res = await fetch(N8N_LESSON_BY_ID_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "obtener", lessonId: lesson.id }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const base64String = data?.base64;
      if (!base64String) throw new Error("No se encontró contenido base64 en la respuesta");

      // convertir base64 a Blob
      const byteCharacters = atob(base64String);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      const blob = new Blob(byteArrays, { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (openInViewer) {
        // Abrir en el viewer integrado
        setViewerUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setViewerTitle(lesson.name);
        setViewerFilename(lesson.filename || `${lesson.name}.pdf`);
        setViewerOpen(true);
      } else {
        // Forzar descarga
        const a = document.createElement("a");
        a.href = url;
        a.download = lesson.filename || `${lesson.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error al obtener archivo desde n8n:", err);
      // fallback: mostrar dummy si hay error
      const blob = createDummyPdfBlob(lesson.name);
      const url = URL.createObjectURL(blob);
      setViewerUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setViewerTitle(lesson.name);
      setViewerFilename(lesson.filename || `${lesson.name}.pdf`);
      setViewerOpen(true);
    } finally {
      setRemoteLoading(false);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        data-lesson-toggle
        onClick={() => setOpen((o) => !o)}
        className="fixed top-4 right-4 z-40 w-11 h-11 rounded-full flex items-center justify-center shadow-md border border-gray-300 dark:border-white/20 bg-white dark:bg-[#0E1720] hover:scale-105 transition-transform cursor-pointer"
      >
        <img
          src={LessonIcon}
          alt="Lecciones"
          className={`w-6 h-6 ${theme === "dark" ? "invert" : ""}`}
        />
      </button>

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className={`fixed top-4 right-4 pt-4 w-72 max-h-[80vh] flex flex-col rounded-xl shadow-xl border border-gray-300 dark:border-white/15 backdrop-blur-md overflow-hidden transition-all duration-300 z-50 ${
          open
            ? "opacity-100 translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-2"
        } bg-white dark:bg-[#0E1720]`}
      >
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide flex-1">
              {`Lecciones del sistema (${(lessons || []).length ? filtered.length : 0})`}
            </h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar panel de lecciones"
              title="Cerrar"
              className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#142532] flex items-center justify-center cursor-pointer"
            >
              <img src={CloseIcon} alt="Cerrar" className="w-4 h-4 dark:invert" />
            </button>
          </div>
          <div className="mt-2 flex items-start gap-2 text-[10px] leading-tight bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-800 rounded-md p-2">
            <img
              src={CautionIcon}
              alt="caution"
              className={`w-4 h-4 mt-0.5 ${theme === "dark" ? "invert" : ""}`}
            />
            <p className="text-[10px]">
              Solo lecciones aprobadas por el administrador serán visibles y
              usadas por el sistema.
            </p>
          </div>
          {/* Search */}
          <div className="mt-2">
              {/* Search Conversations with inline refresh icon (right-aligned) */}
              <div className="mt-2 flex items-center justify-center gap-3">
                <div className="w-full max-w-[44rem] flex items-center justify-center gap-3">
                  <div className="flex-1">
                    <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} className="mt-0" />
                  </div>
                  <div>
                    <button
                      onClick={fetchLessonsFromN8N}
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#142532] transition-colors cursor-pointer"
                      title="Sincronizar lecciones"
                      aria-label="Sincronizar lecciones"
                    >
                      {remoteLoading ? (
                        <svg
                          className="h-6 w-6"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          {/* Arc spinner: circle with gap, rounded caps, rotates left around center */}
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
                      ) : (
                        <img src={RefreshIcon} alt="refrescar" className="w-6 h-6 dark:invert" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
          </div>
        </div>
        {/* Lessons list */}
        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3 text-xs bg-transparent">
          {filtered.length === 0 && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              No hay lecciones que coincidan con la búsqueda.
            </div>
          )}
          {filtered.map((lesson) => (
            <div
              key={lesson.id}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-[#132131] hover:bg-gray-100 dark:hover:bg-[#1B2D3E] transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1 min-h-[1.25rem]">
                <button
                  className="flex-1 min-w-0 font-medium truncate hover:underline underline-offset-2 text-left cursor-pointer"
                  onClick={(e) => handleLessonClick(lesson, e, true)}
                  title={lesson.name}
                >
                  {lesson.name}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => requestDeleteLesson(lesson)}
                    title="Eliminar lección"
                    aria-label="Eliminar lección"
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors cursor-pointer"
                  >
                    {deletingLessonId === lesson.id ? (
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="8"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray="40 24"
                        >
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 12 12"
                            to="360 12 12"
                            dur="0.9s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </svg>
                    ) : (
                      <img src={BinIcon} alt="Eliminar" className={`w-4 h-4 ${theme === 'dark' ? '' : 'invert'}`} />
                    )}
                  </button>
                )}
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-600 dark:text-gray-300">
                <button
                  className="truncate hover:underline underline-offset-2 cursor-pointer text-left"
                  onClick={(e) => handleLessonClick(lesson, e, true)}
                  title="Ver PDF"
                >
                  {lesson.filename}
                </button>
              </div>
              <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 italic">
                Aprobado por {lesson.approvedBy.name} ·{" "}
                {new Date(lesson.approvedBy.date).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          ))}

          {/* sincronización ahora accesible desde el icono al lado del buscador */}
        </div>
        <div className="px-4 pt-3 pb-4 space-y-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0E1720]">
          <Button
            onClick={() => setUploadOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs"
          >
            Subir lección
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs"
          >
            Crear lección
          </Button>
        </div>
      </div>
      {uploadOpen && (
        <LessonModal
          title="Subir lección"
          onClose={() => setUploadOpen(false)}
          onSubmit={handleUploadSubmit}
          theme={theme}
          type="upload"
        />
      )}
      {createOpen && (
        <LessonModal
          title="Crear lección"
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          theme={theme}
          type="create"
        />
      )}
      {successOpen && (
        <SuccessAlert
          message={successMessage}
          onClose={() => {
            setSuccessOpen(false);
            setUploadOpen(false);
            setCreateOpen(false);
          }}
        />
      )}
      {errorOpen && (
        <ErrorAlert
          message={errorMessage}
          type={errorType}
          onClose={() => {
            setErrorOpen(false);
            setUploadOpen(false);
            setCreateOpen(false);
          }}
        />
      )}
      {lessonPendingDeletion && (
        <DeleteConfirmModal
          lesson={lessonPendingDeletion}
          onCancel={() => setLessonPendingDeletion(null)}
          onConfirm={() => {
            const toDelete = lessonPendingDeletion;
            setLessonPendingDeletion(null);
            performDeleteLesson(toDelete);
          }}
          theme={theme}
        />
      )}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setViewerOpen(false);
              if (viewerUrl) URL.revokeObjectURL(viewerUrl);
              setViewerUrl("");
              setViewerFilename("");
              setViewerTitle("");
            }}
          />
          <div className="relative w-[92%] md:w-[80%] lg:w-[60%] h-[70vh] bg-white dark:bg-[#0E1720] border border-gray-300 dark:border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 text-xs md:text-sm font-medium border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#142532] flex items-center gap-2">
              <span className="truncate" title={viewerFilename}>{viewerFilename}</span>
              <span className="text-gray-400">—</span>
              <span className="truncate italic" title={viewerTitle}>{viewerTitle}</span>
              <button
                onClick={() => {
                  setViewerOpen(false);
                  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
                  setViewerUrl("");
                  setViewerFilename("");
                  setViewerTitle("");
                }}
                aria-label="Cerrar visor"
                title="Cerrar"
                className="ml-auto p-1 rounded hover:bg-gray-100 dark:hover:bg-[#142532] cursor-pointer"
              >
                <img src={CloseIcon} alt="Cerrar" className="w-4 h-4 dark:invert" />
              </button>
            </div>
            <iframe title={viewerTitle} src={viewerUrl} className="w-full flex-1" />
          </div>
        </div>
      )}
    </>
  );
};

// Modal Component
const LessonModal = ({ title, onClose, onSubmit, theme, type }) => {
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    categoria: "",
    fecha: "",
    departamento: "",
    proyecto: "",
    palabrasClave: "",
    pdfFile: null,
    autores: "",
    resumen: "",
    introduccion: "",
    desarrollo: "",
    conclusion: "",
    referencias: "",
  });
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [touched, setTouched] = useState({});
  const [focusTarget, setFocusTarget] = useState(null);
  const fieldRefs = useRef({});
  const formContainerRef = useRef(null);
  const [lastFocused, setLastFocused] = useState(null);
  const [focusHistory, setFocusHistory] = useState([]);
  const [nudge, setNudge] = useState(false);
  const [buttonAnimating, setButtonAnimating] = useState(false);
  const isUpload = type === "upload";

  const requiredUploadFields = [
    "titulo",
    "descripcion",
    "categoria",
    "fecha",
    "autores",
    "departamento",
    "proyecto",
    "palabrasClave",
    "pdfFile",
  ];
  const requiredCreateFields = [
    "titulo",
    "autores",
    "resumen",
    "introduccion",
    "desarrollo",
    "conclusion",
    "referencias",
    // fields from the upload form (pdf file NOT included)
    "descripcion",
    "categoria",
    "fecha",
    "departamento",
    "proyecto",
    "palabrasClave",
  ];

  const allValid = () => {
    if (isUpload)
      return requiredUploadFields.every(
        (f) => form[f] && (f !== "pdfFile" || form.pdfFile)
      );
    return requiredCreateFields.every((f) => form[f]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleFile = (file) => {
    setFileError(null);
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name?.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFileError("Solo se permiten archivos PDF");
      setTouched((prev) => ({ ...prev, pdfFile: true }));
      return;
    }
    setForm((prev) => ({ ...prev, pdfFile: file }));
    setTouched((prev) => ({ ...prev, pdfFile: true }));
  };

  const registerFocus = (name) => {
    setLastFocused(name);
    setFocusHistory((prev) => {
      const next = prev.filter((n) => n !== name);
      next.push(name);
      return next;
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const focusMissingField = () => {
    const requiredList = isUpload ? requiredUploadFields : requiredCreateFields;
    const missingAll = requiredList.filter((f) => !form[f]);
    if (missingAll.length === 0) return false;
    // Logic aligned with original working upload behavior: use lastFocused if it's missing, else the last missing field.
    const target = (lastFocused && missingAll.includes(lastFocused))
      ? lastFocused
      : missingAll[missingAll.length - 1];
    setTouched((prev) => ({ ...prev, [target]: true }));
    setFocusTarget(target);
    setTimeout(() => {
      const container = formContainerRef.current;
      const el = fieldRefs.current[target];
      if (!container || !el) return;
      const contRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const delta = elRect.top - contRect.top;
      const targetTop = container.scrollTop + delta - 80;
      container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
      setNudge(true);
      setTimeout(() => setNudge(false), 260);
      setTimeout(() => {
        if (el.focus) el.focus();
        el.classList.add("animate-pulse");
        setTimeout(() => el.classList.remove("animate-pulse"), 700);
      }, 200);
    }, 100);
    setTimeout(() => setFocusTarget(null), 2000);
    return true;
  };

  const handleButtonClick = (e) => {
    // Always run button animation
    setButtonAnimating(true);
    setTimeout(() => setButtonAnimating(false), 500);
    if (!allValid()) {
      // Prevent immediate submit so we can animate and focus first
      e.preventDefault();
      focusMissingField();
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!allValid()) {
      focusMissingField();
      return;
    }
    // Clear validation UI just before submitting
    setTouched({});
    setFocusTarget(null);
    const payload = {
      id: genId(),
      type,
      metadata: isUpload
        ? {
            titulo: form.titulo,
            descripcion: form.descripcion,
            categoria: form.categoria,
            fecha: form.fecha,
              autores: form.autores
                ? form.autores.split(",").map((s) => s.trim()).filter(Boolean)
                : [],
            departamento: form.departamento,
            proyecto: form.proyecto,
            palabrasClave: form.palabrasClave
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            archivoNombre: form.pdfFile ? form.pdfFile.name : null,
          }
          : {
            titulo: form.titulo,
            autores: form.autores
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            resumen: form.resumen,
            introduccion: form.introduccion,
            desarrollo: form.desarrollo,
            conclusion: form.conclusion,
            referencias: form.referencias
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            // Incluyo también los campos de metadatos del "upload" que están presentes en el formulario create
            descripcion: form.descripcion,
            categoria: form.categoria,
            fecha: form.fecha,
            departamento: form.departamento,
            proyecto: form.proyecto,
            palabrasClave: form.palabrasClave
              ? form.palabrasClave
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
          },
    };
    onSubmit(payload, form.pdfFile);
    onClose();
  };

  const attemptClose = () => {
    // Ask confirmation for any modal if there is user input
    const hasInput = Object.keys(form).some((k) => form[k]);
    if (hasInput) {
      setConfirmExit(true);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <form
        ref={formContainerRef}
        onSubmit={submit}
        className={`relative w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0E1720] p-6 shadow-2xl flex flex-col gap-4 scroll-smooth transition-transform duration-300 ${nudge ? '-translate-y-1' : ''}`}
      >
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={attemptClose}
            className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#142532] flex items-center justify-center cursor-pointer"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <img src={CloseIcon} alt="Cerrar" className="w-4 h-4 dark:invert" />
          </button>
        </div>
        {!allValid() && Object.keys(touched).length > 0 && (
          <div className="text-[11px] bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-800 rounded px-3 py-2">
            Por favor completa los campos obligatorios marcados en rojo.
          </div>
        )}
        {isUpload ? (
          <>
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Título de la lección"
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('titulo')}
              required
              error={!form.titulo}
              showError={touched.titulo && !form.titulo}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Descripción breve"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('descripcion')}
              required
              error={!form.descripcion}
              showError={touched.descripcion && !form.descripcion}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Categoría del evento"
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('categoria')}
              required
              error={!form.categoria}
              showError={touched.categoria && !form.categoria}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Fecha"
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('fecha')}
              required
              error={!form.fecha}
              showError={touched.fecha && !form.fecha}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Autor/es (separados por coma)"
              name="autores"
              value={form.autores}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('autores')}
              required
              error={!form.autores}
              showError={touched.autores && !form.autores}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Departamento"
              name="departamento"
              value={form.departamento}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('departamento')}
              required
              error={!form.departamento}
              showError={touched.departamento && !form.departamento}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Proyecto"
              name="proyecto"
              value={form.proyecto}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('proyecto')}
              required
              error={!form.proyecto}
              showError={touched.proyecto && !form.proyecto}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Palabras clave (separadas por coma)"
              name="palabrasClave"
              value={form.palabrasClave}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('palabrasClave')}
              required
              error={!form.palabrasClave}
              showError={touched.palabrasClave && !form.palabrasClave}
            />
            <div
              ref={(el) => {
                fieldRefs.current.pdfFile = el;
              }}
              onClick={() => registerFocus('pdfFile')}
              onFocus={() => registerFocus('pdfFile')}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-md p-6 text-center text-sm ${
                dragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600"
              } ${focusTarget === "pdfFile" ? "ring-2 ring-red-400" : ""}`}

              tabIndex={-1}
            >
              {form.pdfFile ? (
                <div className="text-xs">
                  Archivo seleccionado: {form.pdfFile.name}
                </div>
              ) : (
                <>
                  Arrastra tu PDF aquí o
                  <label className="ml-1 underline cursor-pointer">
                    seleccionar
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files[0] && handleFile(e.target.files[0])
                      }
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, pdfFile: true }))
                      }
                    />
                  </label>
                </>
              )}
            </div>
            {touched.pdfFile && !form.pdfFile && (
              <span className="text-[11px] text-red-600 -mt-2">
                Este campo es obligatorio
              </span>
            )}
            {fileError && (
              <span className="text-[11px] text-red-600 -mt-2">{fileError}</span>
            )}
          </>
        ) : (
          <>
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Título"
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('titulo')}
              required
              error={!form.titulo}
              showError={touched.titulo && !form.titulo}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Autor/es (separados por coma)"
              name="autores"
              value={form.autores}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('autores')}
              required
              error={!form.autores}
              showError={touched.autores && !form.autores}
            />
            {/* Added upload-style fields to the create form (excluding pdfFile) */}
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Descripción breve"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('descripcion')}
              required
              error={!form.descripcion}
              showError={touched.descripcion && !form.descripcion}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Categoría del evento"
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('categoria')}
              required
              error={!form.categoria}
              showError={touched.categoria && !form.categoria}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Fecha"
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('fecha')}
              required
              error={!form.fecha}
              showError={touched.fecha && !form.fecha}
            />
            {/* 'Autor (principal)' removed: use 'Autores' field instead to avoid duplicate author fields */}
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Departamento"
              name="departamento"
              value={form.departamento}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('departamento')}
              required
              error={!form.departamento}
              showError={touched.departamento && !form.departamento}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Proyecto"
              name="proyecto"
              value={form.proyecto}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('proyecto')}
              required
              error={!form.proyecto}
              showError={touched.proyecto && !form.proyecto}
            />
            <TextInput
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Palabras clave (separadas por coma)"
              name="palabrasClave"
              value={form.palabrasClave}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('palabrasClave')}
              required
              error={!form.palabrasClave}
              showError={touched.palabrasClave && !form.palabrasClave}
            />
            <TextArea
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Resumen"
              name="resumen"
              value={form.resumen}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('resumen')}
              required
              error={!form.resumen}
              showError={touched.resumen && !form.resumen}
            />
            <TextArea
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Intro"
              name="introduccion"
              value={form.introduccion}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('introduccion')}
              required
              error={!form.introduccion}
              showError={touched.introduccion && !form.introduccion}
            />
            <TextArea
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Desarrollo"
              name="desarrollo"
              value={form.desarrollo}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('desarrollo')}
              required
              error={!form.desarrollo}
              showError={touched.desarrollo && !form.desarrollo}
            />
            <TextArea
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Conclusión"
              name="conclusion"
              value={form.conclusion}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('conclusion')}
              required
              error={!form.conclusion}
              showError={touched.conclusion && !form.conclusion}
            />
            <TextArea
              fieldRefs={fieldRefs}
              focusTarget={focusTarget}
              label="Referencias (una por línea)"
              name="referencias"
              value={form.referencias}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => registerFocus('referencias')}
              required
              error={!form.referencias}
              showError={touched.referencias && !form.referencias}
            />
          </>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <Button
            type="submit"
            onClick={handleButtonClick}
            className={`px-4 py-2 text-xs relative overflow-hidden ${buttonAnimating ? 'animate-pulse' : ''} ${!allValid() ? 'ring-1 ring-red-400' : ''}`}
          >
            <span className={`${!allValid() ? 'text-red-50' : ''}`}>{isUpload ? "Subir" : "Crear"}</span>
          </Button>
        </div>
        {confirmExit && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#142532] rounded-md p-5 w-full max-w-sm border border-gray-300 dark:border-gray-600 shadow-lg flex flex-col gap-4">
              <p className="text-sm font-medium">¿Seguro quieres salir?</p>
              <div className="flex justify-between gap-3">
                <Button
                  type="button"
                  className="px-3 py-2 text-xs"
                  onClick={() => {
                    setConfirmExit(false);
                    onClose();
                  }}
                >
                  Aceptar
                </Button>
                <Button
                  type="button"
                  className="px-3 py-2 text-xs"
                  onClick={() => setConfirmExit(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

const TextInput = ({
  label,
  required,
  error,
  showError,
  className,
  fieldRefs,
  focusTarget,
  name,
  ...rest
}) => (
  <label className="flex flex-col text-xs gap-1">
    <span className="font-medium">
      {label}
      {required && <span className="text-red-600 ml-0.5">*</span>}
    </span>
    <input
      name={name}
      {...rest}
      ref={(el) => {
        if (name && fieldRefs) fieldRefs.current[name] = el;
      }}
      className={`px-3 py-2 rounded border bg-white dark:bg-[#142532] outline-none text-xs transition-shadow duration-300 ${
        error && showError
          ? "border-red-500"
          : "border-gray-300 dark:border-gray-600"
      } ${name && focusTarget === name ? "ring-2 ring-red-400" : ""} ${
        className || ""
      }`}
    />
    {error && showError && (
      <span className="text-[11px] text-red-600">
        Este campo es obligatorio
      </span>
    )}
  </label>
);

const TextArea = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  onFocus,
  required,
  error,
  showError,
  fieldRefs,
  focusTarget,
  className,
  ...rest
}) => (
  <label className="flex flex-col text-xs gap-1">
    <span className="font-medium">
      {label}
      {required && <span className="text-red-600 ml-0.5">*</span>}
    </span>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      rows={4}
      ref={(el) => {
        if (name && fieldRefs) fieldRefs.current[name] = el;
      }}
      className={`px-3 py-2 rounded border bg-white dark:bg-[#142532] outline-none text-xs resize-y transition-shadow duration-300 ${
        error && showError
          ? "border-red-500"
          : "border-gray-300 dark:border-gray-600"
      } ${name && focusTarget === name ? "ring-2 ring-red-400" : ""} ${className || ""}`}

      {...rest}
    />
    {error && showError && (
      <span className="text-[11px] text-red-600">
        Este campo es obligatorio
      </span>
    )}
  </label>
);

export default LessonList;

// Success Alert Modal
const SuccessAlert = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
          <div className="relative w-[90%] max-w-md rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0E1720] p-5 shadow-2xl">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#142532]"
            >
              ✕
            </button>
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-[#142532] cursor-pointer"
              aria-label="Cerrar alerta"
              title="Cerrar"
            >
              <img src={CloseIcon} alt="Cerrar" className="w-4 h-4 dark:invert" />
            </button>
            <div className="text-center">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                Proceso completado
              </h4>
              <p className="mt-2 text-sm">{message}</p>
            </div>
          </div>
    </div>
  );
};

// Error Alert Modal
const ErrorAlert = ({ message, type, onClose }) => {
  const actionText = type === "upload" ? "subir" : "crear";
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-[90%] max-w-md rounded-xl border border-red-300 dark:border-red-800/50 bg-white dark:bg-[#0E1720] p-5 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-[#142532] cursor-pointer"
          aria-label="Cerrar alerta"
          title="Cerrar"
        >
          <img src={CloseIcon} alt="Cerrar" className="w-4 h-4 dark:invert" />
        </button>
        <div className="text-center">
          <div className="mx-auto w-12 h-12 flex items-center justify-center mb-3">
            <img src={ErrorAlertIcon} alt="Error" className="w-8 h-8" />
          </div>
          <h4 className="text-base font-semibold text-red-900 dark:text-red-400">
            Error al {actionText} la lección
          </h4>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{message}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de confirmación de eliminación (estilo consistente con SuccessAlert)
const DeleteConfirmModal = ({ lesson, onCancel, onConfirm, theme }) => {
  if (!lesson) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-[90%] max-w-md rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0E1720] p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Confirmar eliminación
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              ¿Eliminar la lección "<span className="font-medium">{lesson.name}</span>"?
            </p>
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#142532] cursor-pointer"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <img src={CloseIcon} alt="Cerrar" className="w-4 h-4 dark:invert" />
          </button>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-[#142532] dark:text-gray-200 dark:hover:bg-[#1E2F40] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
