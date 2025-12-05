import React, { useEffect } from "react";
import UserIcon from "/src/assets/user_icon.svg";
import moment from "moment/min/moment-with-locales";
moment.locale("es");
import Markdown from "react-markdown";
import Prism from "prismjs";

const Message = ({ message }) => {
  useEffect(() => {
    Prism.highlightAll();
  }, [message.content]);

  return (
    <div>
      {message.role === "user" ? (
        <div className="flex items-start justify-end my-4 gap-2">
          <div className="flex flex-col gap-2 p-2 px-4 bg-slate-50 dark:bg-[#1E3A8A]/30 border border-[#1E3A8A]/40 rounded-md max-w-2xl min-w-0">
            <p className="text-sm text-black dark:text-white break-words">
              {message.content}
            </p>
            <span className="text-xs text-gray-400 dark:text-gray-300">
              {moment(message.timestamp).fromNow()}
            </span>
          </div>
          <img src={UserIcon} alt="" className="w-8 rounded-full flex-shrink-0" />
        </div>
      ) : (
        <div className="inline-flex flex-col gap-2 p-2 px-4 max-w-2xl min-w-0 bg-primary/20 dark:bg-[#1E3A8A]/30 border border-[#1E3A8A]/40 rounded-md my-4">
          {message.isImage ? (
            <img
              src={message.content}
              alt=""
              className="w-full max-w-md mt-2 rounded-md"
            />
          ) : (
            <div className="text-sm text-black dark:text-white reset-tw overflow-hidden">
              <Markdown>{message.content}</Markdown>
            </div>
          )}
          <span className="text-xs text-gray-800 dark:text-gray-300">
            {moment(message.timestamp).fromNow()}
          </span>
        </div>
      )}
    </div>
  );
};

export default Message;
