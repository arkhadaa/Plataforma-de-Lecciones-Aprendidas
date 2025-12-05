import React from "react";

const SearchBar = ({ value, onChange, className }) => {
  // allow parent to control vertical spacing; default keeps previous mt-4
  const spacing = className !== undefined ? className : "mt-4";
  return (
    <div className={`flex items-center gap-2 p-3 ${spacing} border border-gray-400 dark:border-white/20 rounded-md`}>
      <img
        src="/src/assets/search_icon.svg"
        className="w-4 not-dark:invert"
        alt="search"
      />
      <input
        value={value}
        onChange={onChange}
        type="text"
        placeholder="Buscar..."
        className="text-xs placeholder:text-gray-400 outline-none"
      />
    </div>
  );
};

export default SearchBar;
