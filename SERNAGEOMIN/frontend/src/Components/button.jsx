import React from "react";

const Button = ({ children, onClick, className = "", ...props }) => {
  return (
    <button
      onClick={onClick}
      className={`flex justify-center items-center w-full py-2 text-white bg-[#003c7c] text-sm rounded-none border border-[#003c7c] cursor-pointer hover:bg-[#002a5c] transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
