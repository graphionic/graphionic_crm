"use client";

import { useState } from "react";

export function DeleteLeadButton({
  action,
  name,
}: {
  action: () => Promise<void>;
  name: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);

  if (!armed) {
    return (
      <button className="btn danger" onClick={() => setArmed(true)}>
        Delete lead
      </button>
    );
  }
  return (
    <div className="hstack">
      <span className="small muted">Delete {name} and its whole timeline?</span>
      <form
        action={async () => {
          setPending(true);
          await action();
        }}
      >
        <button className="btn danger" disabled={pending} type="submit">
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
      </form>
      <button className="btn ghost" onClick={() => setArmed(false)}>Cancel</button>
    </div>
  );
}
