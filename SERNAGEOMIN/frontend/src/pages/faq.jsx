import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment/min/moment-with-locales";
import ThumbsUpDownIcon from "/src/assets/thumbs_up_down.svg";
import { useAppContext } from "../Context/AppContext";

moment.locale("es");

// Helper function to compute score from ratings
const computeScore = (ratings = []) => {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((s, v) => s + v, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

const STORAGE_KEY = "sernachat:faqs";
const N8N_FAQS_WEBHOOK =
  import.meta.env.VITE_N8N_FAQS_WEBHOOK || "http://localhost:5678/webhook-test/frecuentes";

const FAQ = () => {
  const [faqs, setFaqs] = useState([]);
  const navigate = useNavigate();
  const commentsRef = useRef({});
  const { theme, user } = useAppContext();
  // Custom scrollbar refs/state (match admin panel design)
  const scrollRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [vBar, setVBar] = useState({ show: false, size: 0, pos: 0 });
  const draggingRef = useRef({ v: false, startY: 0, startScrollTop: 0, vTrackFree: 0 });
  const V_TRACK_TOP = 8; // px
  const V_TRACK_BOTTOM = 8; // px

  // load from webhook or localStorage, with fallback to DUMMY_FAQS
  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        // try to fetch from webhook
        const res = await fetch(N8N_FAQS_WEBHOOK, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error("Respuesta del FAQ no es JSON válido");
        }

        const arr = Array.isArray(data) ? data : [data];
        // map to internal FAQ format - webhook returns id, title, date, votes, numero_comentarios
        const mapped = arr.map((item) => ({
          id: item.id ?? item._id,
          title: item.title || "Sin título",
          answer: "",
          date: item.date || new Date().toISOString(),
          ratings: [],
          comments: Array(item.numero_comentarios || 0).fill(null).map((_, i) => ({ id: `c-${i}` })),
          votesByUser: {},
          votes: item.votes || 0,
          score: item.votes || 0,
        }));

        setFaqs(mapped);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch (e) {
          console.warn("No se pudo guardar FAQ en localStorage:", e);
        }
      } catch (err) {
        console.error("Error al obtener FAQ:", err);
        // fallback to empty array if backend fails
        setFaqs([]);
      }
    };

    fetchFaqs();
  }, []);

  // sorted list by score desc
  const sorted = [...faqs].sort((a, b) => (b.score || 0) - (a.score || 0));

  const recalcScrollbars = () => {
    const el = scrollRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    const vShow = scrollHeight > clientHeight + 1;
    const vTrack = Math.max(container.clientHeight - V_TRACK_TOP - V_TRACK_BOTTOM, 0);
    const vSize = vShow ? Math.max((clientHeight / scrollHeight) * vTrack, 20) : 0;
    const vMaxScroll = Math.max(scrollHeight - clientHeight, 1);
    const vScrollRatio = vMaxScroll > 0 ? Math.min(scrollTop / vMaxScroll, 1) : 0;
    const vPos = vShow ? Math.round(vScrollRatio * Math.max(vTrack - vSize, 0)) : 0;
    setVBar({ show: vShow, size: vSize, pos: vPos });
  };

  useEffect(() => {
    recalcScrollbars();
    const t = setTimeout(recalcScrollbars, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faqs]);

  useEffect(() => {
    const onResize = () => setTimeout(recalcScrollbars, 80);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPanelScroll = () => recalcScrollbars();

  const startDragV = (e) => {
    e.preventDefault();
    const el = scrollRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    const { scrollHeight, clientHeight } = el;
    const vTrack = Math.max(container.clientHeight - V_TRACK_TOP - V_TRACK_BOTTOM, 0);
    const vSize = Math.max((clientHeight / scrollHeight) * vTrack, 20);
    const vTrackFree = Math.max(vTrack - vSize, 1);
    draggingRef.current = { v: true, startY: e.clientY, startScrollTop: el.scrollTop, vTrackFree };
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

  useEffect(() => {
    commentsRef.current = {};
  }, []);

  const openQuestion = (faq) => {
    // send click event to webhook
    fetch("http://localhost:5678/webhook-test/faq-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faqId: faq.id, action: "click", userId: user?._id ?? "anon", votes: faq.votes || 0, user: user?.name || "Anónimo" }),
    }).catch((err) => console.error("Error sending FAQ click:", err));

    // navigate to question page and pass id via url
    navigate(`/faq/${faq.id}`, { state: { id: faq.id } });
  };

  return (
    <div className="flex-1 flex flex-col m-4 md:m-10 xl:mx-30 max-md:mt-14 pr-4 md:pr-10 overflow-hidden">
      <div className="w-full">
        <h1 className="text-2xl font-semibold mb-3">Preguntas Frecuentes</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Listado de consultas más frecuentes — ordenado por puntuación
        </p>

        {/* Contenedor con scroll interno (con custom scrollbar similar a panel de moderación) */}
        <div ref={scrollContainerRef} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white/60 dark:bg-black/20 backdrop-blur-sm overflow-hidden relative">
          <div ref={scrollRef} onScroll={onPanelScroll} className="max-h-[calc(100vh-200px)] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex flex-col gap-3 p-4">
              {sorted.map((faq) => (
                <div
                  key={faq.id}
                  className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden w-full"
                >
                  <div
                    onClick={() => openQuestion(faq)}
                    className={`flex justify-between items-center p-4 cursor-pointer transition-colors duration-150 hover:underline hover:bg-gray-50 dark:hover:bg-[#111214]`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {faq.title}
                      </p>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-300 flex items-center gap-3">
                        <span>{moment(faq.date).format("LL")}</span>
                        <span className="flex items-center gap-1">
                          <img
                            src={ThumbsUpDownIcon}
                            alt="votes"
                            className={`w-4 h-4 ${theme === "dark" ? "invert" : ""}`}
                          />
                          <span className="text-gray-500 dark:text-gray-300">
                            {faq.votes || (faq.ratings || []).length}
                          </span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-300">
                          💬 {faq.comments?.length || 0}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">
                      Ver
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom vertical scrollbar - same visual style as admin panel */}
          {vBar.show && (
            <div
              className="absolute top-[8px] right-0 bottom-2 w-2 z-20"
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
        </div>
      </div>
    </div>
  );
};

export default FAQ;