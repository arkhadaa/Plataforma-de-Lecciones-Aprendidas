import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../Context/AppContext";
import sernageominLogo from "/src/assets/sernageomin_logo.svg";
import Button from "./button";
import AddCircleIcon from "/src/assets/add_circle_white.svg";
import SearchBar from "./SearchBar";
import ChatOptions from "./ChatOptions";
import moment from "moment/min/moment-with-locales";
moment.locale("es");
import FaqIcon from "/src/assets/faq_icon.svg";
import ThemeIcon from "/src/assets/theme_icon.svg";
import UserIcon from "/src/assets/user_icon.svg";
import CloseIcon from "/src/assets/close_icon.svg";
import RefreshIcon from "/src/assets/refresh_icon.svg";

const SideBar = ({ isMenuOpen, setIsMenuOpen }) => {
  const {
    chats,
    theme,
    setSelectedChat,
    selectedChat,
    user,
    setTheme,
    navigate,
    createChat,
    logout,
    fetchUserChats,
  } = useAppContext();
  const sidebarRef = useRef(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e) => {
      const target = e.target;

      if (!target || !(target instanceof Node)) return;
      if (!sidebarRef.current) return;

      if (sidebarRef.current.contains(target)) return;

      if (target.closest && target.closest("[data-chat-options]")) return;

      if (window.innerWidth <= 768) {
        setIsMenuOpen(false);
      }
    };

    const handleResize = () => {
      // Si cambia el tamaño de ventana y está en móvil, cerrar
      if (window.innerWidth <= 768) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, [isMenuOpen, setIsMenuOpen]);

  return (
    <div
      ref={sidebarRef}
      className={`flex flex-col h-screen min-w-72 p-5 dark:bg-gradient-to-b from-[#242124]/30 to-[#000000]/30 border-r border-gray-300 dark:border-white/30 backdrop-blur-3xl transition-all duration-500 max-md:absolute left-0 z-1 ${
        !isMenuOpen && "max-md:-translate-x-full"
      }`}
    >
      {/* Logo */}
      <img
        src={sernageominLogo}
        alt="logo"
        className={`w-full max-w-52 h-auto mx-auto mt-6 ${
          theme === "dark" ? "invert" : ""
        }`}
      />

      {/* New Chat button */}
      <Button
        onClick={() => {
          // if an unfinished/new placeholder chat already exists, select it instead of creating another
          const existingNew = chats.find((c) => c.temporary === true);
          if (existingNew) {
            setSelectedChat(existingNew);
            navigate("/");
            setIsMenuOpen(false);
            return;
          }

          const created = createChat();
          if (created) {
            setSelectedChat(created);
            navigate("/");
            setIsMenuOpen(false);
          }
        }}
        className="mt-10 flex items-center justify-center hover:underline"
      >
        Nuevo Chat
        <img src={AddCircleIcon} alt="add" className="ml-2 w-5 h-5" />
      </Button>

      {/* Search Conversations */}
      <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />

      {/* Recent Chats */}
      {chats.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm">Historial ({chats.length})</p>
          <button
            type="button"
            onClick={async () => {
              if (refreshing) return;
              try {
                setRefreshing(true);
                await fetchUserChats();
              } catch (e) {
                console.error("No se pudo actualizar el historial", e);
              } finally {
                setRefreshing(false);
              }
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#142532] transition-colors cursor-pointer"
            title="Actualizar historial"
            aria-label="Actualizar historial"
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
      )}
      <div className="flex-1 overflow-y-scroll mt-3 text-sm space-y-3">
        {chats
          .filter(
            (chat) =>
              chat.messages?.[0]?.content
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
              chat.name?.toLowerCase().includes(search.toLowerCase())
          )
          .map((chat) => (
            <div
              onClick={() => {
                navigate("/");
                setSelectedChat(chat);
                setIsMenuOpen(false);
              }}
              key={`${chat.id}`}
              className={`p-2 px-4 border border-gray-300 dark:border-[#80609F]/15 rounded-md cursor-pointer flex justify-between group relative transition-all duration-150 hover:bg-gray-100 dark:hover:bg-[#1E3A8A]/20 w-full max-w-full ${
                selectedChat?.id === chat.id
                  ? "bg-blue-50 dark:bg-[#1E3A8A]/20"
                  : ""
              }`}
            >
              <div className="min-w-0 flex-1 max-w-full overflow-hidden">
                <p
                  className={`truncate block max-w-full ${
                    selectedChat?.id === chat.id
                      ? "underline"
                      : "group-hover:underline"
                  }`}
                  title={(() => {
                    const text =
                      chat.messages.length > 0
                        ? chat.messages[0].content
                        : chat.name || "";
                    return text
                      .replace(/```[\s\S]*?```/g, " ")
                      .replace(/`([^`]*)`/g, "$1")
                      .replace(/<[^>]*>/g, " ")
                      .replace(/\n+/g, " ")
                      .trim();
                  })()}
                >
                  {(() => {
                    const text =
                      chat.messages.length > 0
                        ? chat.messages[0].content
                        : chat.name || "";
                    return text
                      .replace(/```[\s\S]*?```/g, " ")
                      .replace(/`([^`]*)`/g, "$1")
                      .replace(/<[^>]*>/g, " ")
                      .replace(/\n+/g, " ")
                      .trim()
                      .slice(0, 32);
                  })()}
                </p>
                <p className="text-xs text-gray-500 dark:text-blue-200/80 truncate">
                  {moment(chat.updatedAt).fromNow()}
                </p>
              </div>
              <div className="flex-shrink-0 ml-2 self-center">
                <ChatOptions chat={chat} />
              </div>
            </div>
          ))}
      </div>

      {/* FAQ Section */}
      <Button
        onClick={() => {
          navigate("/faq");
          // deselect any selected chat when opening FAQ
          setSelectedChat(null);
          setIsMenuOpen(false);
        }}
        className="mt-6 flex items-center justify-center text-sm hover:underline"
      >
        Preguntas Frecuentes/FAQ
        <img src={FaqIcon} className="ml-2 w-5 h-5 invert" alt="FAQ" />
      </Button>

      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-between gap-2 p-3 mt-4 border border-gray-300 dark:border-white/15 rounded-md">
        <div className="flex items-center gap-2 text-sm">
          <img
            src={ThemeIcon}
            className={`w-4 ${theme === "light" ? "invert" : ""}`}
            alt="Tema"
          />
          <p>Modo oscuro</p>
        </div>
        <label className="relative inline-flex cursor-pointer">
          <input
            onChange={() => setTheme(theme === "dark" ? "light" : "dark")}
            type="checkbox"
            className="sr-only peer"
            checked={theme === "dark"}
          />
          <div className="w-9 h-5 bg-gray-400 rounded-full transition-colors duration-200 peer-checked:bg-blue-600 relative"></div>
          <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transform transition-transform duration-200 peer-checked:translate-x-4"></span>
        </label>
      </div>

      {/* User account */}
      <div
        className="flex items-center gap-3 p-3 mt-4 border border-gray-300 dark:border-white/15 rounded-md cursor-pointer group hover:underline"
        onClick={() => {
          if (user?.role === "admin") {
            navigate("/moderacion");
            setIsMenuOpen(false);
          }
        }}
        title={user?.role === "admin" ? "Ir al panel de moderación" : undefined}
      >
        <img src={UserIcon} alt="User" className="w-7 rounded-full" />
        <div className="flex-1 text-sm dark:text-white truncate flex flex-col">
          <span>
            {user
              ? `${user.name || ""}${user.lastName ? " " + user.lastName : ""}`.trim()
              : "Ingresar / Registrarse"}
          </span>
          {user?.role === "admin" && (
            <span className="text-[10px] uppercase tracking-wide text-black dark:text-white">
              Administrador
            </span>
          )}
        </div>

        {user && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // logout flow: show loading then go to login
              navigate("/loading");
              setTimeout(() => {
                logout();
                navigate("/login");
                setIsMenuOpen(false);
              }, 700);
            }}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-[#1E3A8A]/30 transition-all duration-150 cursor-pointer"
          >
            {/* simple logout icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`w-5 h-5 text-black dark:text-white`}
              aria-hidden="true"
            >
              <path
                d="M16 17l5-5-5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12H9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 19H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute inset-0 rounded-full" />
          </button>
        )}
      </div>

      <img
        onClick={() => setIsMenuOpen(false)}
        src={CloseIcon}
        className="absolute top-3 right-3 w-5 h-5 cursor-pointer md:hidden dark:invert hover:underline"
        alt="Close"
      />
    </div>
  );
};

export default SideBar;
