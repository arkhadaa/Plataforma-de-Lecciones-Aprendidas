import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAppContext } from "../Context/AppContext";
import ApproveIcon from "/src/assets/aprove_icon.svg";
import RemoveIcon from "/src/assets/remove_icon.svg";
import RefreshIcon from "/src/assets/refresh_icon.svg";
import CloseIcon from "/src/assets/close_icon.svg";

const Admin = () => {
  const { user, isAdmin, navigate, upsertLesson } = useAppContext();

  // Webhooks para n8n
  const N8N_ADMIN_LIST_WEBHOOK =
    import.meta.env.VITE_N8N_ADMIN_LIST_WEBHOOK || "http://localhost:5678/webhook-test/admin_list";
  const N8N_ADMIN_DECISION_WEBHOOK =
    import.meta.env.VITE_N8N_ADMIN_DECISION_WEBHOOK || "http://localhost:5678/webhook-test/admin_decision";
  const N8N_ADMIN_FILE_WEBHOOK =
    import.meta.env.VITE_N8N_ADMIN_FILE_WEBHOOK || "http://localhost:5678/webhook-test/admin_file";

  // Guard non-admins: simple redirect to home
  useEffect(() => {
    if (!isAdmin) navigate("/");
  }, [isAdmin, navigate]);
  if (!isAdmin) return null;

  const genId = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : "lesson-" + Math.random().toString(36).slice(2) + Date.now();

  const PENDING_KEY = "sernachat:pending_lessons";
  const LESSONS_KEY = "sernachat:lessons";

  const [items, setItems] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Custom scrollbar state for moderation panel (refactor)
  const scrollRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [vBar, setVBar] = useState({ show: false, size: 0, pos: 0 });
  const [hBar, setHBar] = useState({ show: false, size: 0, pos: 0 });
  const draggingRef = useRef({ v: false, h: false, startY: 0, startX: 0, startScrollTop: 0, startScrollLeft: 0 });

  // Offsets used by the custom tracks (match CSS: top-[49px] right-2 bottom-2, left-2 right-2 bottom-2)
  const V_TRACK_TOP = 49; // px, header height inside panel
  const V_TRACK_BOTTOM = 8; // px (bottom-2)
  const H_TRACK_LEFT = 0; // px (left-2)
  const H_TRACK_RIGHT = 0; // px (right-2)

// Versión más robusta con manejo de casos extremos
const recalcScrollbars = () => {
  const el = scrollRef.current;
  if (!el) return;
  const { scrollHeight, clientHeight, scrollTop, scrollWidth, clientWidth, scrollLeft } = el;
  const vShow = scrollHeight > clientHeight + 1;
  const hShow = scrollWidth > clientWidth + 1;

  const container = scrollContainerRef.current;
  const containerHeight = container ? container.clientHeight : clientHeight;
  const containerWidth = container ? container.clientWidth : clientWidth;

  const vTrack = Math.max(containerHeight - V_TRACK_TOP - V_TRACK_BOTTOM, 0);
  const hTrack = Math.max(containerWidth - H_TRACK_LEFT - H_TRACK_RIGHT - (vShow ? 8 : 0), 0);

  // Calcular tamaños con límites más estrictos
  const vSize = vShow ? Math.max((clientHeight / scrollHeight) * vTrack, 20) : 0;
  const hSize = hShow ? Math.max((clientWidth / scrollWidth) * hTrack, 20) : 0;
  
  // Calcular posiciones asegurando que lleguen exactamente al final
  const vMaxScroll = Math.max(scrollHeight - clientHeight, 1);
  const hMaxScroll = Math.max(scrollWidth - clientWidth, 1);
  
  // Usar Math.min para asegurar que no se pase del límite
  const vScrollRatio = vMaxScroll > 0 ? Math.min(scrollTop / vMaxScroll, 1) : 0;
  const hScrollRatio = hMaxScroll > 0 ? Math.min(scrollLeft / hMaxScroll, 1) : 0;
  
  // Calcular posición final asegurando precisión
  const vPos = vShow ? Math.round(vScrollRatio * Math.max(vTrack - vSize, 0)) : 0;
  const hPos = hShow ? Math.round(hScrollRatio * Math.max(hTrack - hSize, 0)) : 0;

  setVBar({ show: vShow, size: vSize, pos: vPos });
  setHBar({ show: hShow, size: hSize, pos: hPos });
};

  useEffect(() => {
    recalcScrollbars();
    const timeoutId = setTimeout(recalcScrollbars, 100);
    return () => clearTimeout(timeoutId);
  }, [items]);

  useEffect(() => {
    const onResize = () => setTimeout(recalcScrollbars, 50);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPanelScroll = () => recalcScrollbars();

  const startDragV = (e) => {
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight } = el;
    const container = scrollContainerRef.current;
    const cH = container ? container.clientHeight : clientHeight;
    const vTrack = Math.max(cH - V_TRACK_TOP - V_TRACK_BOTTOM, 0);
    const vSize = Math.max((clientHeight / scrollHeight) * vTrack, 24);
    const vTrackFree = Math.max(vTrack - vSize, 1);
    draggingRef.current = {
      ...draggingRef.current,
      v: true,
      startY: e.clientY,
      startScrollTop: el.scrollTop,
      vTrackFree,
    };
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onDragV);
    document.addEventListener("mouseup", endDragV);
  };
  const onDragV = (e) => {
    if (!draggingRef.current.v) return;
    const el = scrollRef.current;
    if (!el) return;
    const delta = e.clientY - draggingRef.current.startY;
    const scrollMax = Math.max(el.scrollHeight - el.clientHeight, 0);
    const ratio = scrollMax / (draggingRef.current.vTrackFree || 1);
    el.scrollTop = Math.min(Math.max(draggingRef.current.startScrollTop + delta * ratio, 0), scrollMax);
    recalcScrollbars();
  };
  const endDragV = () => {
    draggingRef.current.v = false;
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", onDragV);
    document.removeEventListener("mouseup", endDragV);
  };

const startDragH = (e) => {
  e.preventDefault();
  const el = scrollRef.current;
  if (!el) return;
  const { scrollWidth, clientWidth, scrollHeight, clientHeight } = el;
  const vShow = scrollHeight > clientHeight + 1; // Añade esta línea
  const container = scrollContainerRef.current;
  const cW = container ? container.clientWidth : clientWidth;
  // Usa el mismo cálculo que en recalcScrollbars:
  const hTrack = Math.max(cW - H_TRACK_LEFT - H_TRACK_RIGHT - (vShow ? 8 : 0), 0);
  const hSize = Math.max((clientWidth / scrollWidth) * hTrack, 24);
  const hTrackFree = Math.max(hTrack - hSize, 1);
  draggingRef.current = {
    ...draggingRef.current,
    h: true,
    startX: e.clientX,
    startScrollLeft: el.scrollLeft,
    hTrackFree,
  };
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onDragH);
  document.addEventListener("mouseup", endDragH);
};
const onDragH = (e) => {
  if (!draggingRef.current.h) return;
  const el = scrollRef.current;
  if (!el) return;
  const delta = e.clientX - draggingRef.current.startX;
  const scrollMax = Math.max(el.scrollWidth - el.clientWidth, 0);
  const ratio = scrollMax / (draggingRef.current.hTrackFree || 1);
  const newScrollLeft = draggingRef.current.startScrollLeft + delta * ratio;
  
  // Asegurar que llegue exactamente al final
  el.scrollLeft = Math.max(0, Math.min(newScrollLeft, scrollMax));
  recalcScrollbars();
};
  const endDragH = () => {
    draggingRef.current.h = false;
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", onDragH);
    document.removeEventListener("mouseup", endDragH);
  };

  // Cargar lecciones desde n8n al montar
  useEffect(() => {
    fetchPendingLessons();
  }, []);

  const fetchPendingLessons = async () => {
    try {
      const res = await fetch(N8N_ADMIN_LIST_WEBHOOK, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.lessons || data.data || [];
      
      const lessons = raw.map((l) => ({
        id: l.id || l._id || l.uid || genId(),
        titulo: l.titulo || l.title || l.name || l.nombre || "Sin título",
        archivo:
          l.archivo ||
          l.file ||
          l.filename ||
          l.fileName ||
          l.archivoNombre ||
          l.file_url ||
          l.archivoUrl ||
          null,
        fecha: l.fecha || l.createdAt || l.uploadedAt || l.date || new Date().toISOString(),
        autor: l.autor || l.author || l.uploader || "",
        status: "pendiente",
        ...l,
      }));
      
      setItems(lessons);
      try {
        localStorage.setItem(PENDING_KEY, JSON.stringify(lessons));
      } catch (e) {
        console.warn("No se pudo guardar en localStorage:", e);
      }
    } catch (err) {
      console.error("Error al obtener lecciones:", err);
      // Fallback: cargar desde localStorage
      try {
        const stored = localStorage.getItem(PENDING_KEY);
        if (stored) {
          const fallback = JSON.parse(stored);
          if (Array.isArray(fallback) && fallback.length > 0) {
            setItems(fallback);
          } else {
            // seed dummy pending lessons if cache empty
            const dummy = [
              { id: genId(), titulo: "Documento de prueba 1", archivo: "dummy_1.pdf", fecha: new Date().toISOString(), autor: "Sistema", status: "pendiente" },
              { id: genId(), titulo: "Documento de prueba 2", archivo: "dummy_2.pdf", fecha: new Date(Date.now() - 86400000).toISOString(), autor: "Sistema", status: "pendiente" },
              { id: genId(), titulo: "Documento de prueba 3", archivo: "dummy_3.pdf", fecha: new Date(Date.now() - 2*86400000).toISOString(), autor: "Sistema", status: "pendiente" },
            ];
            setItems(dummy);
            try { localStorage.setItem(PENDING_KEY, JSON.stringify(dummy)); } catch {}
          }
        } else {
          // no cache: create dummy pending lessons
          const dummy = [
            { id: genId(), titulo: "Documento de prueba 1", archivo: "dummy_1.pdf", fecha: new Date().toISOString(), autor: "Sistema", status: "pendiente" },
            { id: genId(), titulo: "Documento de prueba 2", archivo: "dummy_2.pdf", fecha: new Date(Date.now() - 86400000).toISOString(), autor: "Sistema", status: "pendiente" },
            { id: genId(), titulo: "Documento de prueba 3", archivo: "dummy_3.pdf", fecha: new Date(Date.now() - 2*86400000).toISOString(), autor: "Sistema", status: "pendiente" },
          ];
          setItems(dummy);
          try { localStorage.setItem(PENDING_KEY, JSON.stringify(dummy)); } catch {}
        }
      } catch (e) {
        console.warn("No se pudo cargar desde localStorage:", e);
        // Si todo falla, generar dummy
        const dummy = [
          { id: genId(), titulo: "Documento de prueba 1", archivo: "dummy_1.pdf", fecha: new Date().toISOString(), autor: "Sistema", status: "pendiente" },
          { id: genId(), titulo: "Documento de prueba 2", archivo: "dummy_2.pdf", fecha: new Date(Date.now() - 86400000).toISOString(), autor: "Sistema", status: "pendiente" },
          { id: genId(), titulo: "Documento de prueba 3", archivo: "dummy_3.pdf", fecha: new Date(Date.now() - 2*86400000).toISOString(), autor: "Sistema", status: "pendiente" },
        ];
        setItems(dummy);
      }
    }
  };

  const persist = (next) => {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(next));
    } catch {}
    setItems(next);
  };

  // On approval, also upsert into the main lessons storage so LessonList picks it up
  const upsertIntoApprovedLessons = (lesson) => {
    const approvedBy = { name: user?.name || "Administrador", date: new Date().toISOString() };
    upsertLesson({ id: lesson.id, name: lesson.titulo, filename: lesson.archivo, approvedBy });
  };

  const approve = async (id) => {
    const lesson = items.find((l) => l.id === id);
    if (!lesson) return;

    setProcessingId(id);
    try {
      const res = await fetch(N8N_ADMIN_DECISION_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: id,
          decision: "approved",
          approvedBy: user?.name || "Admin",
          approvedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      
      console.log("Lección aprobada:", id);
      upsertIntoApprovedLessons(lesson);
      
      // Mover a fin con estado aprobado
      const next = items.map((x) => (x.id === id ? { ...x, status: "aprobado" } : x));
      const target = next.find((x) => x.id === id);
      const rest = next.filter((x) => x.id !== id);
      const reordered = [...rest, target];
      persist(reordered);
    } catch (err) {
      console.error("Error al aprobar:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (id) => {
    const lesson = items.find((l) => l.id === id);
    if (!lesson) return;

    setProcessingId(id);
    try {
      const res = await fetch(N8N_ADMIN_DECISION_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: id,
          decision: "rejected",
          rejectedBy: user?.name || "Admin",
          rejectedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      
      console.log("Lección rechazada:", id);
      
      // Mover a fin con estado rechazado
      const next = items.map((x) => (x.id === id ? { ...x, status: "rechazado" } : x));
      const target = next.find((x) => x.id === id);
      const rest = next.filter((x) => x.id !== id);
      const reordered = [...rest, target];
      persist(reordered);
    } catch (err) {
      console.error("Error al rechazar:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const displayName = useMemo(() => {
    const name = user?.name || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`; // sin coma
  }, [user]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerFilename, setViewerFilename] = useState("");

  const openViewer = async (lesson) => {
    // lesson: objeto con id, archivo, base64, archivoUrl, titulo, etc.
    if (!lesson) return;

    setViewerTitle(lesson.titulo || lesson.title || "Lección");
    const filename = lesson.archivo || lesson.filename || lesson.fileName || "documento.pdf";

    // helper: fallback dummy pdf
    const showDummy = (title, fname) => {
      const safeTitle = (title || "Lección").replace(/[()]/g, "");
      const pdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 70 >>\nstream\nBT /F1 12 Tf 30 100 Td (${safeTitle}) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000061 00000 n \n0000000111 00000 n \n0000000278 00000 n \n0000000402 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n500\n%%EOF`;
      const file = new File([pdf], fname || "documento.pdf", { type: "application/pdf" });
      const url = URL.createObjectURL(file);
      setViewerUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setViewerFilename(fname || "documento.pdf");
      setViewerOpen(true);
    };

    try {
      // If lesson already contains base64, use it
      if (lesson.base64) {
        const base64 = lesson.base64.startsWith("data:") ? lesson.base64.split(",")[1] : lesson.base64;
        const byteCharacters = atob(base64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setViewerUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setViewerFilename(filename);
        setViewerOpen(true);
        return;
      }

      // If lesson.archivo is an URL, open directly
      if (lesson.archivo && /^(https?:)?\/\//.test(lesson.archivo)) {
        setViewerUrl(lesson.archivo);
        setViewerFilename(filename);
        setViewerOpen(true);
        return;
      }

      // Otherwise request the file from the webhook (by id or filename)
      const payload = { lessonId: lesson.id || lesson.uid || lesson._id || null, filename: lesson.archivo || null };
      const res = await fetch(N8N_ADMIN_FILE_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json().catch(() => null);

      // n8n should return either { base64: "..." } or { fileUrl: "..." }
      if (data?.base64) {
        const base64 = data.base64.startsWith("data:") ? data.base64.split(",")[1] : data.base64;
        const byteCharacters = atob(base64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setViewerUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setViewerFilename(data.filename || filename);
        setViewerOpen(true);
        return;
      }

      if (data?.fileUrl) {
        setViewerUrl(data.fileUrl);
        setViewerFilename(data.filename || filename);
        setViewerOpen(true);
        return;
      }

      // fallback to dummy if response doesn't include file
      showDummy(lesson.titulo, filename);
    } catch (err) {
      console.error("Error al obtener archivo:", err);
      // fallback dummy
      showDummy(lesson.titulo, filename);
    }
  };

  return (
    <div className="flex-1 flex flex-col m-4 md:m-10 xl:mx-30 max-md:mt-14 pr-4 md:pr-10 overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">{displayName}</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">Administrador</p>
      </div>

      {/* Moderation Panel - refactor: outer container holds tracks */}
      <div
        ref={scrollContainerRef}
        className="border border-gray-300 dark:border-white/15 rounded-lg bg-white/60 dark:bg-black/20 backdrop-blur-sm mt-2 relative"
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-sm md:text-base font-medium">Panel de moderación</span>
          <button
            type="button"
            onClick={async () => {
              if (refreshing) return;
              try {
                setRefreshing(true);
                await fetchPendingLessons();
              } catch (e) {
                console.error("No se pudo actualizar la lista de pendientes", e);
              } finally {
                setRefreshing(false);
              }
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#142532] transition-colors cursor-pointer"
            title="Actualizar pendientes"
            aria-label="Actualizar pendientes"
          >
            {refreshing ? (
              <svg
                className="h-6 w-6"
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
            ) : (
              <img src={RefreshIcon} alt="refrescar" className="w-6 h-6 dark:invert" />
            )}
          </button>
        </div>
        {/* Scroll container without padding */}
        <div
          ref={scrollRef}
          onScroll={onPanelScroll}
          className="relative max-h-[420px] overflow-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Inner padding for content to avoid overlay with custom bars */}
          <div className="pb-3">
            <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-100 dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 z-10">
              <tr>
                <th className="text-left px-4 py-3">Archivo</th>
                <th className="text-left px-4 py-3">Título</th>
                <th className="text-left px-4 py-3">Fecha de carga</th>
                <th className="text-left px-4 py-3">Autor</th>
                <th className="text-left px-4 py-3 pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/70 dark:hover:bg-white/5">
                  <td className="px-4 py-3 font-mono">
                    {row.status === "pendiente" ? (
                      <button
                        onClick={() => openViewer(row)}
                        className="text-left w-full truncate hover:underline underline-offset-2 cursor-pointer font-mono"
                        title="Ver archivo"
                      >
                        {row.archivo}
                      </button>
                    ) : (
                      <span
                        className="text-left w-full truncate font-mono text-gray-500 dark:text-gray-400 cursor-default"
                        title="Acción aplicada"
                      >
                        {row.archivo}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "pendiente" ? (
                      <button
                        onClick={() => openViewer(row)}
                        className="text-left w-full truncate hover:underline underline-offset-2 cursor-pointer"
                        title="Ver lección"
                      >
                        {(() => {
                          const text = row.titulo || "";
                          const cleaned = text
                            .replace(/```[\s\S]*?```/g, " ")
                            .replace(/`([^`]*)`/g, "$1")
                            .replace(/<[^>]*>/g, " ")
                            .replace(/\n+/g, " ")
                            .trim();
                          const fragment = cleaned.slice(0, 32);
                          return fragment + "...";
                        })()}
                      </button>
                    ) : (
                      <span
                        className="text-left w-full truncate text-gray-500 dark:text-gray-400 cursor-default"
                        title="Acción aplicada"
                      >
                        {(() => {
                          const text = row.titulo || "";
                          const cleaned = text
                            .replace(/```[\s\S]*?```/g, " ")
                            .replace(/`([^`]*)`/g, "$1")
                            .replace(/<[^>]*>/g, " ")
                            .replace(/\n+/g, " ")
                            .trim();
                          const fragment = cleaned.slice(0, 32);
                          return fragment + "...";
                        })()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "pendiente" ? (
                      <span>
                        {new Date(row.fecha).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 cursor-default">
                        {new Date(row.fecha).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "pendiente" ? (
                      <span>{row.autor}</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 cursor-default">{row.autor}</span>
                    )}
                  </td>
                  <td className="px-4 pr-6 py-3">
                    {row.status === "pendiente" ? (
                      <div className="flex items-center gap-2 justify-start">
                        <button
                          onClick={() => approve(row.id)}
                          disabled={processingId === row.id}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-white bg-emerald-400 hover:bg-emerald-500 active:bg-emerald-600 transition-colors disabled:opacity-60"
                          title="Aprobar"
                          aria-label="Aprobar"
                        >
                          <img src={ApproveIcon} alt="aprobar" className="w-4 h-4 invert" />
                        </button>
                        <button
                          onClick={() => reject(row.id)}
                          disabled={processingId === row.id}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-white bg-rose-400 hover:bg-rose-500 active:bg-rose-600 transition-colors disabled:opacity-60"
                          title="Rechazar"
                          aria-label="Rechazar"
                        >
                          <img src={RemoveIcon} alt="rechazar" className="w-4 h-4 invert" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                            row.status === "aprobado"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                          }`}
                        >
                          {row.status === "aprobado" ? "Aprobado" : "Rechazado"}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>

        {/* Custom vertical scrollbar - correctly positioned within outer container edges */}
        {vBar.show && (
          <div
            className="absolute top-[64px] right-0 bottom-2 w-2 z-20"
            aria-hidden="true"
            style={{ pointerEvents: "none" }}
          >
            <div className="relative h-full w-2 rounded bg-gray-200/70 dark:bg-white/10 overflow-hidden">
              <div
                onMouseDown={startDragV}
                className="absolute left-0 w-2 rounded bg-gray-500 dark:bg-white/40 cursor-pointer transition-colors hover:bg-gray-600 dark:hover:bg-white/60"
                style={{ top: vBar.pos + "px", height: vBar.size + "px", pointerEvents: "auto" }}
              />
            </div>
          </div>
        )}

        {/* Custom horizontal scrollbar - correctly positioned within outer container edges */}
        {hBar.show && (
          <div
            className="absolute left-0 right-0 bottom-0 h-2 z-20"
            aria-hidden="true"
            style={{ pointerEvents: "none", right: vBar.show ? "8px" : "0px" }}
          >
            <div className="relative w-full h-2 rounded bg-gray-200/70 dark:bg-white/10 overflow-hidden">
              <div
                onMouseDown={startDragH}
                className="absolute top-0 h-2 rounded bg-gray-500 dark:bg-white/40 cursor-pointer transition-colors hover:bg-gray-600 dark:hover:bg-white/60"
                style={{ left: hBar.pos + "px", width: hBar.size + "px", pointerEvents: "auto", maxWidth: `calc(100% - ${hBar.pos}px)` }}
              />
            </div>
          </div>
        )}
      </div>
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
            {/* Modal header showing real filename and title */}
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
    </div>
  );
};

export default Admin;
