import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../Context/AppContext";
import MoreIcon from "/src/assets/more_options.svg";
import ShareIcon from "/src/assets/share.svg";
import DownloadIcon from "/src/assets/download.svg";
import DeleteIcon from "/src/assets/delete.svg";

const ACCIONES_SIDEBAR_WEBHOOK = "http://localhost:5678/webhook-test/acciones_sidebar";

const ChatOptions = ({ chat }) => {
  const { theme, downloadChat, shareChat, deleteChat, setSelectedChat, user } =
    useAppContext();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const target = e.target;
      if (
        buttonRef.current &&
        menuRef.current &&
        !buttonRef.current.contains(target) &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    
    const handleResize = () => {
      if (open && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPos({
          top: rect.bottom + window.scrollY + 6,
          right: window.innerWidth - rect.right,
        });
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  const onShare = () => {
    setShareModalOpen(true);
    setOpen(false);
  };

  const onDownload = () => {
    downloadChat(chat);
    setOpen(false);
  };

  const onDelete = () => {
    setConfirmOpen(true);
    setOpen(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      const payload = {
        action: "eliminar",
        chatId: chat.id,
        userId: user?._id ?? "anon",
      };
      await fetch(ACCIONES_SIDEBAR_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Error al enviar acción de eliminar:", err);
    }
    deleteChat(chat.id);
    setConfirmOpen(false);
  };

  const options = [
    { icon: ShareIcon, text: "Compartir", onClick: onShare },
    { icon: DownloadIcon, text: "Descargar", onClick: onDownload },
    {
      icon: DeleteIcon,
      text: "Eliminar",
      onClick: onDelete,
      textColor: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="relative inline-block" ref={ref}>
      {/* 3 points button */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          if (setSelectedChat) setSelectedChat(chat);
          const rect = e.currentTarget.getBoundingClientRect();
          setPos({
            top: rect.bottom + window.scrollY + 6,
            right: window.innerWidth - rect.right,
          });
          setOpen((s) => !s);
        }}
        className="relative w-7 h-7 flex items-center justify-center rounded-full
                   hover:bg-blue-200 dark:hover:bg-[#1E3A8A]/30
                   active:bg-blue-300 dark:active:bg-[#1E3A8A]/50
                   transition-all duration-150"
      >
        <img src={MoreIcon} alt="more" className="w-4 h-4 dark:invert" />
        {/* Círculo de reacción al click */}
        <span
          className={`absolute inset-0 rounded-full ${
            open ? "bg-blue-300 dark:bg-[#1E3A8A]/40 opacity-30" : "opacity-0"
          } transition-opacity duration-150`}
        />
      </button>

      {/* Menú desplegable */}
      {open &&
        createPortal(
          <div
            data-chat-options
            ref={menuRef}
            className={`w-44 rounded-xl shadow-lg z-50 overflow-hidden border ${
              theme === "dark"
                ? "bg-[#1E1B26] border-white"
                : "bg-white border-white"
            }`}
            style={{
              position: "absolute",
              top: `${pos.top}px`,
              right: `${pos.right}px`,
            }}
            onClick={(e) => e.stopPropagation()} // evitar cerrar al click dentro
          >
            {options.map((option) => {
              const optHover =
                theme === "dark"
                  ? "hover:bg-[#1E3A8A]/20 active:bg-[#1E3A8A]/30"
                  : "hover:bg-blue-50 active:bg-blue-100";
              return (
                <button
                  key={option.text}
                  onClick={option.onClick}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-150 ${optHover} ${
                    option.textColor || "text-gray-900 dark:text-white"
                  }`}
                >
                  <img
                    src={option.icon}
                    alt={option.text}
                    className="w-4 h-4 dark:invert"
                  />
                  {option.text}
                </button>
              );
            })}
          </div>,
          document.body
        )}

      {/* Confirmación de eliminación (portal) */}
      {confirmOpen &&
        createPortal(
          <div
            data-chat-options
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/40"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              className="bg-white dark:bg-[#1E1B26] rounded-lg p-4 w-80 border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-4 text-sm text-gray-900 dark:text-white">
                ¿Seguro que quieres eliminar este chat?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-3 py-1 rounded bg-blue-200 dark:bg-[#1E3A8A]/20 text-gray-900 dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-3 py-1 rounded bg-red-600 text-white"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de compartir chat */}
      {shareModalOpen &&
        createPortal(
          <ShareChatModal
            chat={chat}
            user={user}
            onClose={() => setShareModalOpen(false)}
            onSubmit={(data) => {
              setShareModalOpen(false);
            }}
            theme={theme}
          />,
          document.body
        )}
    </div>
  );
};

export default ChatOptions;

// Modal de compartir chat
const ShareChatModal = ({ chat, user, onClose, onSubmit, theme }) => {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [errors, setErrors] = useState({ recipient: false, subject: false });
  const [showErrors, setShowErrors] = useState(false);
  const [focusTarget, setFocusTarget] = useState(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const fieldRefs = useRef({});

  const hasChanges = recipient.trim() || subject.trim();

  const validateFields = () => {
    const newErrors = {
      recipient: !recipient.trim(),
      subject: !subject.trim(),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((e) => e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowErrors(true);
    if (validateFields()) {
      try {
        const payload = {
          action: "compartir",
          chatId: chat.id,
          userId: user?._id ?? "anon",
          destinatario: recipient.trim(),
          asunto: subject.trim(),
        };
        await fetch(ACCIONES_SIDEBAR_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Error al enviar acción de compartir:", err);
      }
      onSubmit({ recipient: recipient.trim(), subject: subject.trim() });
    } else {
      // Focus en el primer campo con error
      const firstErrorField = Object.entries(errors).find(([, err]) => err)?.[0];
      if (firstErrorField) {
        setFocusTarget(firstErrorField);
        fieldRefs.current[firstErrorField]?.focus();
        setTimeout(() => setFocusTarget(null), 500);
      }
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setExitConfirmOpen(true);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-[#1E1B26] rounded-lg w-96 border ${
          theme === "dark"
            ? "border-gray-700"
            : "border-gray-200"
        } shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Compartir Chat
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <TextInput
            label="Destinatario"
            name="recipient"
            type="email"
            placeholder="correo@ejemplo.com"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
            error={errors.recipient}
            showError={showErrors}
            fieldRefs={fieldRefs}
            focusTarget={focusTarget}
          />

          <TextInput
            label="Asunto"
            name="subject"
            type="text"
            placeholder="Describe el asunto principal"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            error={errors.subject}
            showError={showErrors}
            fieldRefs={fieldRefs}
            focusTarget={focusTarget}
          />

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Compartir
            </button>
          </div>
        </form>
      </div>

      {/* Confirmación de cierre con cambios */}
      {exitConfirmOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40"
          onClick={() => setExitConfirmOpen(false)}
        >
          <div
            className={`bg-white dark:bg-[#1E1B26] rounded-lg p-4 w-80 border ${
              theme === "dark"
                ? "border-gray-700"
                : "border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-sm text-gray-900 dark:text-white">
              Tienes cambios sin guardar. ¿Deseas salir o continuar editando?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setExitConfirmOpen(false);
                }}
                className="px-3 py-1 rounded bg-blue-200 dark:bg-[#1E3A8A]/20 text-gray-900 dark:text-white"
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  setExitConfirmOpen(false);
                  onClose();
                }}
                className="px-3 py-1 rounded bg-red-600 text-white"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente TextInput reutilizable
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
    <span className="font-medium text-gray-900 dark:text-white">
      {label}
      {required && <span className="text-red-600 ml-0.5">*</span>}
    </span>
    <input
      name={name}
      {...rest}
      ref={(el) => {
        if (el && fieldRefs) fieldRefs.current[name] = el;
      }}
      className={`px-3 py-2 rounded border bg-white dark:bg-[#142532] outline-none text-xs transition-shadow duration-300 text-gray-900 dark:text-white ${
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
