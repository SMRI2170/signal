"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/browser";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: new URL("/auth/callback", window.location.origin).toString(),
          shouldCreateUser: true,
        },
      });

      if (error) throw error;
      setMessage("メールを送信しました。届いたリンクをこのブラウザで開いてください。");
    } catch {
      setMessage("メールを送信できませんでした。アドレスを確認してもう一度お試しください。");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form className="magic-link-form" onSubmit={handleSubmit}>
      <label htmlFor="email">EMAIL</label>
      <input
        autoComplete="email"
        id="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        required
        type="email"
        value={email}
      />
      <button className="button button-primary" disabled={isSending} type="submit">
        {isSending ? "送信しています…" : "Magic Linkを送る"} <span aria-hidden="true">→</span>
      </button>
      {message ? <p aria-live="polite" className="auth-message">{message}</p> : null}
    </form>
  );
}
