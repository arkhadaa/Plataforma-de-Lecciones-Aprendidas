import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import moment from "moment/min/moment-with-locales";
import ThumbsUpDownIcon from "/src/assets/thumbs_up_down.svg";
import ThumbUp from "/src/assets/thumb_up.svg";
import ThumbDown from "/src/assets/thumb_down.svg";
import SendIcon from "/src/assets/send_icon.svg";
import { useAppContext } from "../Context/AppContext";
import Button from "../Components/button";

moment.locale && moment.locale("es");

// Helper function to compute score from ratings
const computeScore = (ratings = []) => {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((s, v) => s + v, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

const STORAGE_KEY = "sernachat:faqs";
const N8N_FAQS_WEBHOOK =
  import.meta.env.VITE_N8N_FAQS_WEBHOOK || "http://localhost:5678/webhook-test/frecuentes";

const QuestionPage = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, theme } = useAppContext();

  const [faq, setFaq] = useState(null);
  const [userVote, setUserVote] = useState(0);
  const [loading, setLoading] = useState(true);

  // Answer scrollbar refs and state
  const answerScrollRef = useRef(null);
  const answerContainerRef = useRef(null);
  const [vBarAnswer, setVBarAnswer] = useState({ show: false, size: 0, pos: 0 });
  const draggingAnswerRef = useRef({ v: false, startY: 0, startScrollTop: 0, vTrackFree: 0 });

  // Comments scrollbar refs and state
  const commentsScrollRef = useRef(null);
  const commentsContainerRef = useRef(null);
  const [vBarComments, setVBarComments] = useState({ show: false, size: 0, pos: 0 });
  const draggingCommentsRef = useRef({ v: false, startY: 0, startScrollTop: 0, vTrackFree: 0 });

  const V_TRACK_TOP = 8;
  const V_TRACK_BOTTOM = 8;

  // Function to fetch fresh FAQ data from faq-click webhook with userId and faqId
  const fetchFaqData = async (faqId, userId, votes = 0) => {
    try {
      const res = await fetch("http://localhost:5678/webhook-test/faq-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faqId, userId, votes, action: "view", user: user?.name || "Anónimo" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      let data = JSON.parse(text);

      // Webhook returns an array of objects
      if (!Array.isArray(data)) {
        data = [data];
      }

      // Get answer from first item (all should have same answer)
      const answer = (data[0]?.answer || data[0]?.respuesta || "");

      // Combine ALL comments from all objects in the array
      let allComments = [];
      data.forEach((item) => {
        if (Array.isArray(item.comments)) {
          allComments = allComments.concat(item.comments);
        } else if (item.comments && typeof item.comments === "object") {
          allComments.push(item.comments);
        }
      });

      console.log("fetchFaqData -> combined comments:", allComments.length, allComments);

      // Webhook should return: answer, comments, votes
      return {
        id: faqId,
        answer: answer,
        comments: allComments,
        ratings: [],
        votes: data[0]?.votes || 0,
        votesByUser: {},
      };
    } catch (err) {
      console.error("Error al obtener FAQ del webhook:", err);
      return null;
    }
  };

  useEffect(() => {
    const loadQuestion = async () => {
      setLoading(true);
      const raw = localStorage.getItem(STORAGE_KEY);
      let list = [];
      if (raw) {
        try {
          list = JSON.parse(raw);
        } catch (e) {
          console.warn(e);
        }
      }
      if (!list || list.length === 0) {
        // No cached FAQs, will need to fetch from backend
        list = [];
      }

      let faqToShow = null;

      // if the navigation passed the faq object in state, use it directly
      if (state && state.faq) {
        faqToShow = state.faq;
      } else {
        const found = list.find((f) => f.id === id || (state && state.id === f.id));
        if (found) {
          faqToShow = found;
        }
      }

      if (!faqToShow) {
        navigate("/faq");
        setLoading(false);
        return;
      }

      // Get userId
      const userId = user?._id || "anon";

      // Try to fetch fresh data from faq-click webhook, passing current votes
      const freshData = await fetchFaqData(faqToShow.id, userId, faqToShow.votes || 0);
      if (freshData) {
        // Merge webhook data with existing data from localStorage
        faqToShow = {
          ...faqToShow,
          answer: freshData.answer,
          comments: freshData.comments,
          ratings: freshData.ratings,
          votes: freshData.votes,
          votesByUser: freshData.votesByUser,
          score: computeScore(freshData.ratings || []),
        };
        // Update localStorage with merged data
        list = list.map((f) => (f.id === faqToShow.id ? faqToShow : f));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        console.log("loadQuestion -> FAQ updated:", faqToShow);
      } else {
        console.warn("No fresh data from webhook, using cached data");
      }

      // Set user vote
      const uv = (faqToShow.votesByUser && faqToShow.votesByUser[userId]) || 0;
      setUserVote(uv);
      setFaq(faqToShow);
      setLoading(false);
    };

    loadQuestion();
  }, [id, state, navigate, user]);

  // Answer scrollbar recalc
  const recalcAnswerBar = () => {
    const el = answerScrollRef.current;
    const container = answerContainerRef.current;
    if (!el || !container) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    const vShow = scrollHeight > clientHeight + 1;
    const vTrack = Math.max(container.clientHeight - V_TRACK_TOP - V_TRACK_BOTTOM, 0);
    const vSize = vShow ? Math.max((clientHeight / scrollHeight) * vTrack, 20) : 0;
    const vMaxScroll = Math.max(scrollHeight - clientHeight, 1);
    const vScrollRatio = vMaxScroll > 0 ? Math.min(scrollTop / vMaxScroll, 1) : 0;
    const vPos = vShow ? Math.round(vScrollRatio * Math.max(vTrack - vSize, 0)) : 0;
    setVBarAnswer({ show: vShow, size: vSize, pos: vPos });
  };

  // Comments scrollbar recalc
  const recalcCommentsBar = () => {
    const el = commentsScrollRef.current;
    const container = commentsContainerRef.current;
    if (!el || !container) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    const vShow = scrollHeight > clientHeight + 1;
    const vTrack = Math.max(container.clientHeight - V_TRACK_TOP - V_TRACK_BOTTOM, 0);
    const vSize = vShow ? Math.max((clientHeight / scrollHeight) * vTrack, 20) : 0;
    const vMaxScroll = Math.max(scrollHeight - clientHeight, 1);
    const vScrollRatio = vMaxScroll > 0 ? Math.min(scrollTop / vMaxScroll, 1) : 0;
    const vPos = vShow ? Math.round(vScrollRatio * Math.max(vTrack - vSize, 0)) : 0;
    setVBarComments({ show: vShow, size: vSize, pos: vPos });
  };

  useEffect(() => {
    recalcAnswerBar();
    recalcCommentsBar();
    const t1 = setTimeout(recalcAnswerBar, 80);
    const t2 = setTimeout(recalcCommentsBar, 80);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faq]);

  useEffect(() => {
    const onResize = () => {
      setTimeout(recalcAnswerBar, 80);
      setTimeout(recalcCommentsBar, 80);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Answer drag handlers
  const startDragAnswer = (e) => {
    e.preventDefault();
    const el = answerScrollRef.current;
    const container = answerContainerRef.current;
    if (!el || !container) return;
    const { scrollHeight, clientHeight } = el;
    const vTrack = Math.max(container.clientHeight - V_TRACK_TOP - V_TRACK_BOTTOM, 0);
    const vSize = Math.max((clientHeight / scrollHeight) * vTrack, 20);
    const vTrackFree = Math.max(vTrack - vSize, 1);
    draggingAnswerRef.current = { v: true, startY: e.clientY, startScrollTop: el.scrollTop, vTrackFree };
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onDragAnswer);
    document.addEventListener("mouseup", endDragAnswer);
  };

  const onDragAnswer = (e) => {
    if (!draggingAnswerRef.current.v) return;
    const el = answerScrollRef.current;
    if (!el) return;
    const delta = e.clientY - draggingAnswerRef.current.startY;
    const scrollMax = Math.max(el.scrollHeight - el.clientHeight, 0);
    const ratio = scrollMax / (draggingAnswerRef.current.vTrackFree || 1);
    el.scrollTop = Math.min(Math.max(draggingAnswerRef.current.startScrollTop + delta * ratio, 0), scrollMax);
    recalcAnswerBar();
  };

  const endDragAnswer = () => {
    draggingAnswerRef.current.v = false;
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", onDragAnswer);
    document.removeEventListener("mouseup", endDragAnswer);
  };

  // Comments drag handlers
  const startDragComments = (e) => {
    e.preventDefault();
    const el = commentsScrollRef.current;
    const container = commentsContainerRef.current;
    if (!el || !container) return;
    const { scrollHeight, clientHeight } = el;
    const vTrack = Math.max(container.clientHeight - V_TRACK_TOP - V_TRACK_BOTTOM, 0);
    const vSize = Math.max((clientHeight / scrollHeight) * vTrack, 20);
    const vTrackFree = Math.max(vTrack - vSize, 1);
    draggingCommentsRef.current = { v: true, startY: e.clientY, startScrollTop: el.scrollTop, vTrackFree };
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onDragComments);
    document.addEventListener("mouseup", endDragComments);
  };

  const onDragComments = (e) => {
    if (!draggingCommentsRef.current.v) return;
    const el = commentsScrollRef.current;
    if (!el) return;
    const delta = e.clientY - draggingCommentsRef.current.startY;
    const scrollMax = Math.max(el.scrollHeight - el.clientHeight, 0);
    const ratio = scrollMax / (draggingCommentsRef.current.vTrackFree || 1);
    el.scrollTop = Math.min(Math.max(draggingCommentsRef.current.startScrollTop + delta * ratio, 0), scrollMax);
    recalcCommentsBar();
  };

  const endDragComments = () => {
    draggingCommentsRef.current.v = false;
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", onDragComments);
    document.removeEventListener("mouseup", endDragComments);
  };

  const persist = (updater) => {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : [];
    list = list.map((f) => (f.id === faq.id ? updater(f) : f));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    const updated = list.find((f) => f.id === faq.id);
    const userId = user?._id || "anon";
    updated.userVote =
      (updated.votesByUser && updated.votesByUser[userId]) || 0;
    setFaq(updated);
    setUserVote(updated.userVote || 0);
  };

  const addComment = (text) => {
    const author = user?.name || "Anónimo";
    const userId = user?._id ?? "anon";
    persist((f) => ({
      ...f,
      comments: [
        ...(f.comments || []),
        {
          id: `c-${Date.now()}`,
          user: author,
          text,
          date: new Date().toISOString(),
        },
      ],
    }));
    
    // send comment to webhook
    fetch("http://localhost:5678/webhook-test/faq-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faqId: faq.id, action: "comment", comment: text, userId, user: author, numero_comentarios: (faq.comments?.length || 0) + 1 }),
    }).catch((err) => console.error("Error sending FAQ comment:", err));
  };

  // value: 5 (like) or 2 (dislike)
  const toggleVote = (value) => {
    const userId = user?._id || "anon";
    persist((f) => {
      const ratings = [...(f.ratings || [])];
      const byUser = { ...(f.votesByUser || {}) };
      const prev = byUser[userId];
      if (prev === value) {
        // undo
        const idx = ratings.indexOf(prev);
        if (idx >= 0) ratings.splice(idx, 1);
        delete byUser[userId];
      } else {
        // switch or new
        if (prev) {
          const idx = ratings.indexOf(prev);
          if (idx >= 0) ratings.splice(idx, 1);
        }
        ratings.push(value);
        byUser[userId] = value;
      }
      const newScore = ratings.length
        ? Math.round(
            (ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10
          ) / 10
        : 0;
      return {
        ...f,
        ratings,
        votesByUser: byUser,
        score: newScore,
        votes: ratings.length,
      };
    });
    
    // send vote to webhook
    const voteType = value === 5 ? "like" : "dislike";
    fetch("http://localhost:5678/webhook-test/faq-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faqId: faq.id, action: "vote", voteType, userId, votes: faq.votes || 0 }),
    }).catch((err) => console.error("Error sending FAQ vote:", err));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center m-4 md:m-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-3"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando pregunta...</p>
        </div>
      </div>
    );
  }

  if (!faq) return null;

  return (
    <div className="flex-1 flex flex-col justify-between m-4 md:m-10 xl:mx-30 max-md:mt-14 pr-4 md:pr-10 max-h-screen overflow-hidden">
      <div className="w-full flex flex-col overflow-y-auto overflow-x-hidden flex-1">
        <Button
          onClick={() => navigate(-1)}
          className="px-2 py-1 text-sm w-fit flex items-center gap-1"
        >
          ←Volver
        </Button>

        <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071018] flex-shrink-0">
          {/* Header: title and votes */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
            <h1 className="text-lg font-semibold flex-1">{faq.title}</h1>
            <div className="flex items-center gap-2 ml-4">
              <img
                src={ThumbsUpDownIcon}
                className={`w-5 h-5 ${theme === "dark" ? "invert" : ""}`}
                alt="votes"
              />
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {faq.votes || (faq.ratings || []).length}
              </div>
            </div>
          </div>

          {/* Answer container with custom scrollbar */}
          <div ref={answerContainerRef} className="relative border-b border-gray-200 dark:border-gray-700">
            <div
              ref={answerScrollRef}
              onScroll={recalcAnswerBar}
              className="max-h-[25vh] overflow-y-auto"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="p-4">
                <p className="leading-relaxed text-gray-800 dark:text-gray-200">{faq.answer}</p>
              </div>
            </div>

            {/* Custom vertical scrollbar for answer */}
            {vBarAnswer.show && (
              <div
                className="absolute top-[8px] right-0 bottom-2 w-2 z-20"
                aria-hidden="true"
                style={{ pointerEvents: "none" }}
              >
                <div className="relative h-full w-2 rounded bg-gray-200/70 dark:bg-white/10 overflow-hidden">
                  <div
                    onMouseDown={startDragAnswer}
                    className="absolute left-0 w-2 rounded bg-gray-500 dark:bg-white/40 cursor-pointer transition-colors hover:bg-gray-600 dark:hover:bg-white/60"
                    style={{ top: vBarAnswer.pos + "px", height: vBarAnswer.size + "px", pointerEvents: "auto" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Votes section */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <button
                onClick={() => toggleVote(5)}
                className={`flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors ${
                  userVote === 5
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-green-700 dark:hover:bg-green-900 text-gray-800 dark:text-gray-200"
                }`}
              >
                <img
                  src={ThumbUp}
                  alt="like"
                  className={`w-4 h-4 transition-all${
                    userVote === 5
                      ? "filter invert brightness-0"
                      : theme === "light"
                      ? "filter invert-0 brightness-0"
                      : "filter invert brightness-0"
                  }`}
                />
                Me gusta
              </button>
              <button
                onClick={() => toggleVote(2)}
                className={`flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors ${
                  userVote === 2
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-red-700 dark:hover:bg-red-900 text-gray-800 dark:text-gray-200"
                }`}
              >
                <img
                  src={ThumbDown}
                  alt="dislike"
                  className={`w-4 h-4 transition-all${
                    userVote === 2
                      ? "filter invert brightness-0"
                      : theme === "light"
                      ? "filter invert-0 brightness-0"
                      : "filter invert brightness-0"
                  }`}
                />
                No me gusta
              </button>
            </div>
          </div>

          {/* Comments section with custom scrollbar */}
          <div className="px-4 py-3 flex flex-col">
            <h3 className="font-medium mb-2">Comentarios ({faq.comments?.length || 0})</h3>
            
            {/* Comments container with custom scrollbar */}
            <div ref={commentsContainerRef} className="relative mb-3 border border-gray-100 dark:border-gray-800 rounded h-[15vh]">
              <div
                ref={commentsScrollRef}
                onScroll={recalcCommentsBar}
                className="h-full overflow-y-auto"
                style={{ scrollbarWidth: "none" }}
              >
                <div className="space-y-3 p-2">
                  {faq.comments && faq.comments.length > 0 ? (
                    faq.comments.map((c) => (
                      <div key={c.id} className="flex flex-col gap-1 pr-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="text-sm font-semibold">{c.user}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 -mt-1">
                            {moment(c.date).format("LL")}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-200">{c.text}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No hay comentarios aún.</div>
                  )}
                </div>
              </div>

              {/* Custom vertical scrollbar for comments */}
              {vBarComments.show && (
                <div
                  className="absolute top-[8px] right-0 bottom-2 w-2 z-20"
                  aria-hidden="true"
                  style={{ pointerEvents: "none" }}
                >
                  <div className="relative h-full w-2 rounded bg-gray-200/70 dark:bg-white/10 overflow-hidden">
                    <div
                      onMouseDown={startDragComments}
                      className="absolute left-0 w-2 rounded bg-gray-500 dark:bg-white/40 cursor-pointer transition-colors hover:bg-gray-600 dark:hover:bg-white/60"
                      style={{ top: vBarComments.pos + "px", height: vBarComments.size + "px", pointerEvents: "auto" }}
                    />
                  </div>
                </div>
              )}
            </div>

            <CommentForm onSend={(text) => addComment(text)} theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
};

const CommentForm = ({ onSend, theme }) => {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText("");
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-start gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe tu comentario..."
              rows={3}
              className="flex-1 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071018] outline-none resize-y overflow-y-auto max-h-[140px]"
        />
        <div className="flex items-end">
          <Button type="submit" className="px-3 py-2 flex items-center">
            Enviar
            <img
              src={SendIcon}
              alt="send"
              className="w-4 h-4 ml-2 invert brightness-0 saturate-0"
            />
          </Button>
        </div>
      </div>
    </form>
  );
};

export default QuestionPage;
