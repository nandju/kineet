"use client";

import { useId } from "react";

export function ChapnetMark({ className = "w-8 h-8" }: { className?: string }) {
  const id = `chapnet-mark-${useId()}`;

  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={id} x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2E6BFF" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#FF7A45" />
        </linearGradient>
      </defs>
      <path
        d="M34 12.5C31.2 9.9 27.5 8.3 23.5 8.3 15.2 8.3 8.5 15 8.5 23.3s6.7 15 15 15c4.3 0 8.2-1.8 10.9-4.7"
        stroke={`url(#${id})`}
        strokeWidth="4.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M28.5 17C26.9 15.5 24.8 14.6 22.5 14.6c-4.9 0-8.9 4-8.9 8.9s4 8.9 8.9 8.9c2.4 0 4.6-.9 6.2-2.5"
        stroke={`url(#${id})`}
        strokeWidth="4.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="34.5" cy="11.5" r="3" fill="#2E6BFF" />
      <circle cx="34.5" cy="35" r="3" fill="#FF7A45" />
    </svg>
  );
}

export function ChapnetWordmark({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span className="text-foreground">CHAP</span>
      <span className="brand-gradient-text">NET</span>
    </span>
  );
}

export function ChapnetLogo({ markClassName = "w-8 h-8", wordmarkClassName = "text-2xl", className = "" }: {
  markClassName?: string;
  wordmarkClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <ChapnetMark className={markClassName} />
      <ChapnetWordmark className={wordmarkClassName} />
    </span>
  );
}
