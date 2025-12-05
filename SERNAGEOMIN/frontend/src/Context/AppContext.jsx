import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

const AppContext = createContext();

const N8N_LOGIN_WEBHOOK =
  import.meta.env.VITE_N8N_LOGIN_WEBHOOK || "http://localhost:5678/webhook-test/login";
const N8N_REGISTER_WEBHOOK =
  import.meta.env.VITE_N8N_REGISTER_WEBHOOK || "http://localhost:5678/webhook-test/login_register";
const N8N_HISTORY_WEBHOOK =
  import.meta.env.VITE_N8N_HISTORY_WEBHOOK || "http://localhost:5678/webhook-test/historial";

export const AppContextProvider = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const LESSONS_KEY = "sernachat:lessons";
  const [lessons, setLessons] = useState(() => {
    try {
      const raw = localStorage.getItem(LESSONS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const fetchUser = async () => {
    // try to load persisted user from localStorage (pre-backend)
    try {
      const raw = localStorage.getItem("sernachat:user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        return;
      }
    } catch (e) {
      // ignore
    }
    setUser(null);
  };

  // pre-backend: register a user locally and persist
  const registerUser = async ({ name, lastName, email, password }) => {
    try {
      const res = await fetch(N8N_REGISTER_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lastName, email, password }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      
      const data = await res.json();
      const userData = {
        _id: data.id || data._id || data.userId || `user-${Date.now()}`,
        name: data.name || name,
        lastName: data.lastName || lastName,
        email: data.email || email,
        role: data.role || "user",
        isAdmin: data.role === "admin",
        isModerator: data.role === "moderator",
      };

      setUser(userData);
      try {
        localStorage.setItem("sernachat:user", JSON.stringify(userData));
        if (data.token) localStorage.setItem("sernachat:token", data.token);
      } catch (e) {
        console.warn("No se pudo guardar en localStorage:", e);
      }
      
      console.log("Usuario registrado:", userData);
      return userData;
    } catch (err) {
      console.error("Error al registrar:", err);
      throw new Error("No se pudo completar el registro. Intenta de nuevo.");
    }
  };

  // pre-backend: login by email/password locally (very simple)
  const loginUser = async ({ email, password }) => {
    try {
      const res = await fetch(N8N_LOGIN_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      // aceptar objeto o array [user]
      const payload = Array.isArray(data) ? data[0] : data;

      // extraer nombre y apellido: preferir campos explícitos, si no split del nombre completo
      const fullName = (payload.name || payload.nombre || "").toString().trim();
      const explicitLastName = payload.lastName || payload.apellido || payload.surname || "";
      const parts = fullName ? fullName.split(/\s+/) : [];
      const firstName = parts.length ? parts.shift() : (email.split("@")[0] || "Usuario");
      const lastName = explicitLastName || (parts.length ? parts.join(" ") : "");

      const role = (payload.role || payload.rol || payload.userRole || "user").toString().toLowerCase();

      const userData = {
        _id: payload.id || payload._id || payload.userId || `user-${Date.now()}`,
        name: firstName,
        lastName: lastName,
        email: payload.email || email,
        role,
        // isAdmin/isModerator kept for quick checks if needed
        isAdmin: role === "admin",
        isModerator: role === "moderator" || role === "moderador",
      };

      setUser(userData);
      try {
        localStorage.setItem("sernachat:user", JSON.stringify(userData));
        const token = payload.token || data.token;
        if (token) localStorage.setItem("sernachat:token", token);
      } catch (e) {
        console.warn("No se pudo guardar en localStorage:", e);
      }

      console.log("Usuario autenticado (payload):", payload);
      return userData;
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      throw new Error("Email o contraseña incorrectos.");
    }
  };

  const logout = () => {
    setUser(null);
    setChats([]);
    setSelectedChat(null);
    try {
      localStorage.removeItem("sernachat:user");
      localStorage.removeItem("sernachat:token");
    } catch {}
    navigate("/login");
  };

  const fetchUserChats = async () => {
    // Si no hay usuario autenticado, limpiar y salir
    if (!user || !user._id) {
      setChats([]);
      setSelectedChat(null);
      return;
    }
    try {
      // Construir URL con query param userId
      const userIdParam = encodeURIComponent(user._id);
      const url = `${N8N_HISTORY_WEBHOOK}${N8N_HISTORY_WEBHOOK.includes("?") ? "&" : "?"}userId=${userIdParam}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Respuesta del historial no es JSON válido");
      }

      const arr = Array.isArray(data) ? data : [data];
      const normalized = arr.map((item) => {
        const now = Date.now();
        const rawId =
          item.id ??
          item._id ??
          item.chatId ??
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `chat-${now}-${Math.floor(Math.random() * 100000)}`);
        const id = String(rawId);
        const fechaIso = item.fecha || item.createdAt || new Date(now).toISOString();
        const ts = Number(new Date(fechaIso)) || now;
        const pregunta = (item.pregunta || item.question || item.prompt || "").toString();
        const respuesta = (item.respuesta || item.answer || item.text || "").toString();

        return {
          id,
          userId: String(item.user ?? user._id),
          userName: user?.name || "",
          name: pregunta ? pregunta.slice(0, 32) : `Chat ${id}`,
          messages: [
            ...(pregunta
              ? [
                  {
                    isImage: false,
                    isPublished: false,
                    role: "user",
                    content: pregunta,
                    timestamp: ts,
                  },
                ]
              : []),
            ...(respuesta
              ? [
                  {
                    isImage: false,
                    isPublished: true,
                    role: "assistant",
                    content: respuesta,
                    timestamp: ts + 1,
                  },
                ]
              : []),
          ],
          temporary: false,
          createdAt: new Date(ts).toISOString(),
          updatedAt: new Date(respuesta ? ts + 1 : ts).toISOString(),
        };
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      console.log("fetchUserChats -> registros:", normalized.length, normalized.map(c => c.id));
      setChats(normalized);
      setSelectedChat((prev) => {
        if (!prev && normalized.length) return normalized[0];
        if (prev) {
          const found = normalized.find((c) => c.id === prev.id);
          return found || normalized[0] || null;
        }
        return prev;
      });
    } catch (err) {
      console.error("Error al obtener historial:", err);
      // Fallback: sin dummyChats - esperar a que el usuario cree un chat
      const normalized = [];
      setChats(normalized);
      setSelectedChat(null);
    }
  };

  // Create a new chat and put it at the top of the list
  const createChat = (initialMessage) => {
    const now = Date.now();
    const newChat = {
      // use a stable unique id to prepare for backend integration
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `chat-${now}-${Math.floor(Math.random() * 100000)}`,
      userId: user?._id || "anon",
      userName: user?.name || "",
      name: initialMessage ? initialMessage.slice(0, 32) : "Nuevo Chat",
      messages: initialMessage
        ? [
            {
              isImage: false,
              isPublished: false,
              role: "user",
              content: initialMessage,
              timestamp: now,
            },
          ]
        : [],
      // mark as temporary if created without an initial message so the UI can reuse it
      temporary: !initialMessage,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };

    setChats((prev) => [newChat, ...prev]);
    setSelectedChat(newChat);
    return newChat;
  };

  // Append a message to a chat (create if missing) and update its title if it has a default name
  const sendMessageToChat = (chatId, message) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        const updated = {
          ...c,
          messages: [...(c.messages || []), message],
          updatedAt: new Date().toISOString(),
          // once a message is added, this chat is no longer temporary
          temporary: false,
        };
        // if chat name is empty or default 'New'/'Nuevo', update it from message
        const nameLower = (c.name || "").toLowerCase();
        if (
          !c.name ||
          nameLower.includes("new") ||
          nameLower.includes("nuevo")
        ) {
          updated.name = message.content.slice(0, 32);
        }
        return updated;
      })
    );

    // also update selectedChat if it's the same
    if (selectedChat?.id === chatId) {
      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), message],
        updatedAt: new Date().toISOString(),
        name: prev.name,
      }));
    }
  };

  const deleteChat = (chatId) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedChat?.id === chatId) setSelectedChat(null);
    console.log(`Chat eliminado: ${chatId}`);
  };

  const shareChat = async (chat) => {
    const textToShare = chat.messages.map((m) => m.content).join("\n");
    if (navigator.share) {
      try {
        await navigator.share({
          title: chat.name || "Chat compartido",
          text: textToShare,
        });
      } catch (err) {
        console.error("Error al compartir:", err);
      }
    } else {
      navigator.clipboard.writeText(textToShare);
      alert("Texto del chat copiado al portapapeles");
    }
  };

  const downloadChat = (chat) => {
    const doc = new jsPDF();
    const margin = 15;
    const lineHeight = 8;
    const pageHeight = doc.internal.pageSize.height - margin;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    let y = margin;
    let messageIndex = 1;

    chat.messages.forEach((msg) => {
      const role = msg.role === "user" ? "Consulta" : "Respuesta";
      const textLines = doc.splitTextToSize(msg.content, 180);
      
      // Agregar salto si no hay espacio
      if (y + textLines.length * lineHeight + 8 > pageHeight) {
        doc.addPage();
        y = margin;
      }

      // Escribir el rol en negrita
      doc.setFont("helvetica", "bold");
      doc.text(`${messageIndex}. ${role}:`, margin, y);
      y += lineHeight;

      // Escribir el contenido del mensaje
      doc.setFont("helvetica", "normal");
      doc.text(textLines, margin + 5, y);
      y += textLines.length * lineHeight + 5;
      
      messageIndex++;
    });

    doc.save(`${chat.name || "chat"}.pdf`);
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      fetchUserChats();
    } else {
      setChats([]);
      setSelectedChat(null);
    }
  }, [user]);

  useEffect(() => {
    fetchUser();
  }, []);

  const value = {
    navigate,
    user,
    setUser,
    fetchUser,
    fetchUserChats,
    registerUser,
    loginUser,
    logout,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    theme,
    setTheme,
    deleteChat,
    shareChat,
    downloadChat,
    setTheme,
    createChat,
    sendMessageToChat,
    // lessons live state for LessonList and Moderation
    lessons,
    setLessons,
    upsertLesson: (entry) => {
      // entry: { id, name, filename, approvedBy }
      setLessons((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        let idx = arr.findIndex((l) => l.id === entry.id);
        if (idx === -1) {
          idx = arr.findIndex(
            (l) =>
              (l.filename || "").toLowerCase() ===
              (entry.filename || "").toLowerCase()
          );
        }
        if (idx >= 0) arr[idx] = { ...arr[idx], ...entry };
        else arr.push(entry);
        // persist
        try {
          localStorage.setItem(LESSONS_KEY, JSON.stringify(arr));
        } catch {}
        return arr;
      });
    },
    removeLessonById: (id) => {
      setLessons((prev) => {
        if (!Array.isArray(prev)) return prev;
        const next = prev.filter((l) => l.id !== id);
        try {
          localStorage.setItem(LESSONS_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    // convenience helpers
    isAdmin: user?.role === "admin",
    userRole: user?.role || "user",
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
