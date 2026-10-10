"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function HimiCommandBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/himi?message=${encodeURIComponent(trimmed)}`);
  };

  const handleChipClick = (prompt: string) => {
    router.push(`/himi?message=${encodeURIComponent(prompt)}`);
  };

  const suggestionChips = [
    "What should I focus on?",
    "Show untouched leads",
    "Recent activity",
  ];

  return (
    <div className="dash-command-wrap">
      <form onSubmit={handleSubmit} className="dash-command-bar">
        <span className="dash-command-icon" aria-hidden="true">✦</span>
        <input
          type="text"
          className="dash-command-input"
          placeholder="Ask HIMI anything about your CRM..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Ask HIMI command input"
        />
        <button
          type="submit"
          className="dash-command-btn"
          disabled={!query.trim()}
          aria-label="Submit command to HIMI"
        >
          <span>Ask</span>
          <Icon name="arrow-right" size={13} strokeWidth={2.2} />
        </button>
      </form>

      <div className="dash-chips" role="group" aria-label="Suggested prompts">
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            className="dash-chip"
            onClick={() => handleChipClick(chip)}
          >
            <span className="dash-chip-sparkle" aria-hidden="true">✦</span>
            <span>{chip}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
