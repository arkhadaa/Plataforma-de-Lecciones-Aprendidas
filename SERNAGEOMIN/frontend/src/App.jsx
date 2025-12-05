import React, { useState } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import Chatbox from "./Components/chatbox";
import Login from "./pages/Login";
import FAQ from "./pages/faq";
import QuestionPage from "./pages/question";
import Admin from "./pages/admin";
import Sidebar from "./Components/sidebar";
import LessonList from "./Components/LessonList";
import MenuIcon from "/src/assets/menu_icon.svg";
import "/src/assets/prism.css";
import Loading from "./pages/loading";
import { useAppContext } from "./Context/AppContext";

const App = () => {
  const { user } = useAppContext();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { pathname } = useLocation();

  // if we're on loading route, always render Loading as full-screen (covers sidebar)
  if (pathname === "/loading") return <Loading />;

  return (
    <>
      {/* hide menu icon on login page */}
      {!isMenuOpen && pathname !== "/login" && (
        <img
          onClick={() => setIsMenuOpen(true)}
          src={MenuIcon}
          className="absolute top-3 left-3 w-8 h-8 cursor-pointer md-hidden not-dark:invert"
          alt=""
        />
      )}

      {user ? (
        <div className="dark:bg-gradient-to-b from-[#373737] to-[#000000] dark:text-white">
          <div className="flex h-screen w-screen">
            <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
            <Routes>
              <Route path="/" element={<Chatbox />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/faq/:id" element={<QuestionPage />} />
              <Route path="/moderacion" element={<Admin />} />
              <Route path="/loading" element={<Loading />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
            <LessonList />
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/loading" element={<Loading />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
};

export default App;
