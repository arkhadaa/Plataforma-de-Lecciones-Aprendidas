import React, { useState, useEffect, useRef } from "react";
import sernageominLogo from "/src/assets/sernageomin_logo.svg";
import { useAppContext } from "../Context/AppContext";
import Message from "./message";
import StopIcon from "/src/assets/stop_icon.svg";
import SendIcon from "/src/assets/send_icon.svg";
import Suggestions from "./Suggestions";
import { useNavigate } from "react-router-dom";

const Chatbox = () => {
  const containerRef = useRef(null);

  const {
    selectedChat,
    theme,
    createChat,
    sendMessageToChat,
    setSelectedChat,
    user,
  } = useAppContext();

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(false); /* placeholder for AI call */

  const [prompt, setPrompt] = useState("");
  // hidden until the user types
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [inputWidth, setInputWidth] = useState(null);

  useEffect(() => {
    const measure = () => {
      if (formRef.current) setInputWidth(formRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const now = Date.now();
    const userMessage = {
      isImage: false,
      isPublished: false,
      role: "user",
      content: prompt,
      timestamp: now,
    };

  // optimista: mostrar inmediatamente
  setMessages((prev) => [...prev, userMessage]);
  setPrompt("");
  // hide suggestions after submitting
  setShowSuggestions(false);
    setLoading(true);

    try {
      // crear chat si no existe
      let chatId = selectedChat?.id;
      if (!chatId) {
        const newChat = createChat(prompt);
        if (newChat && setSelectedChat) setSelectedChat(newChat);
        chatId = newChat?.id;
      } else {
        sendMessageToChat(chatId, userMessage);
      }

      // llamar al webhook de n8n (reemplaza la URL por tu webhook)
      const webhookUrl = "http://localhost:5678/webhook-test/chatbox";

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, chatId, userId: user?._id ?? "anon" }),
      });

      const data = await res.json();
      const assistantText = data?.answer || data?.text || JSON.stringify(data);

      const assistantMessage = {
        isImage: false,
        isPublished: true,
        role: "assistant",
        content: assistantText,
        timestamp: Date.now(),
      };

      // guardar respuesta
      sendMessageToChat(chatId, assistantMessage);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Error enviando a n8n:", err);
      // opcional: agregar mensaje de error visible al usuario
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      setMessages(selectedChat.messages || []);
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  useEffect(() => {
    if (containerRef.current)
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col justify-between m-4 md:m-10 xl:mx-30 max-md:mt-14 pr-4 md:pr-10">
      {/* Chat messages */}
      <div
        ref={containerRef}
        className="flex-1 mb-5 overflow-y-scroll px-4 md:px-8"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-primary">
            <img
              src={sernageominLogo}
              alt=""
              className={`w-full max-w-60 sm:max-w-72 ${
                theme === "dark" ? "invert" : ""
              }`}
            />
            <p className="mt-5 text-4xl sm:text-6xl text-center text-gray-400 dark:text-white">
              ¿Qué te gustaría saber hoy?
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}

        {/* Three Dots Loading */}
        {loading && (
          <div className="loader flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-white animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-white animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-white animate-bounce"></div>
          </div>
        )}
      </div>

      {/* Prompt Input box */}
      <div className="relative">
        <Suggestions
          query={prompt}
          visible={showSuggestions}
          inputWidth={inputWidth}
          onClose={() => setShowSuggestions(false)}
          onSelect={(faq) => {
            // open the FAQ detail page for the selected suggestion (do not send to chat or rename chat)
            setShowSuggestions(false);
            if (!faq) return;
            // pass the full faq in state so the question page can render immediately
            navigate(`/faq/${faq.id}`, { state: { id: faq.id, faq } });
          }}
        />

        <form
          onSubmit={onSubmit}
          ref={formRef}
          className={`
    w-full max-w-full py-2 px-3 mx-auto flex gap-3 items-center rounded-full border transition-colors duration-300
    border-[#1E3A8A]/40
    bg-gradient-to-b from-white/20 to-white/80
    dark:from-blue-400/20 dark:to-blue-600/20
  `}
        >
          <input
            onChange={(e) => {
              const v = e.target.value;
              setPrompt(v);
              // show suggestions only when the user has typed something
              setShowSuggestions(Boolean(v && v.trim().length > 0));
            }}
            value={prompt}
            type="text"
            placeholder="Escribe tu pregunta..."
            className="flex-1 text-sm bg-transparent text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-300 outline-none"
            required
          />
          <button disabled={loading} className="flex items-center">
            <img
              src={loading ? StopIcon : SendIcon}
              className="w-7 h-7 cursor-pointer dark:invert transition-transform duration-150 hover:scale-110"
              alt=""
            />
          </button>
        </form>
        {/* measurement handled via effect; no extra DOM node needed */}
      </div>
    </div>
  );
};

export default Chatbox;
