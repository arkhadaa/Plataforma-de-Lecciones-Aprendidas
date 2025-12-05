import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Loading = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate("/");
    }, 4000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="flex items-center justify-center h-screen w-screen text-white text-2xl bg-[#1E3A8A]">
      <div className="w-10 h-10 rounded-full border-3 border-white border-t-transparent animate-spin"></div>
    </div>
  );
};

export default Loading;
