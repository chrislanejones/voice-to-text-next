"use client";

import React from "react";

interface GatedProps {
  locked: boolean;
  onUnlock: () => void;
  className?: string;
  children: React.ReactNode;
}

// AI controls stay on screen while signed out, dimmed, so people can see
// what's there. Any click, or Enter/Space on a focused control, asks for
// the password instead of acting.
export default function Gated({ locked, onUnlock, className, children }: GatedProps) {
  if (!locked) return <div className={className}>{children}</div>;

  const block = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={`${className ?? ""} vt-locked`}
      title="Sign in to use AI tools"
      // mousedown is blocked too, so selects don't open.
      onMouseDownCapture={block}
      onClickCapture={(event) => {
        block(event);
        onUnlock();
      }}
      onKeyDownCapture={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        block(event);
        onUnlock();
      }}
    >
      {children}
    </div>
  );
}
