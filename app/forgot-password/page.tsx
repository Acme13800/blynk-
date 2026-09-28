"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const send = async (kind: "password" | "confirmation", event?: FormEvent) => {
    event?.preventDefault(); if (!email.trim() || !isSupabaseConfigured || !supabase) { setNotice("Enter your email and make sure Supabase is connected."); return; }
    setBusy(true); setNotice("");
    const redirectTo = `${window.location.origin}${kind === "password" ? "/reset-password" : "/login"}`;
    const { error } = kind === "password" ? await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo }) : await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: redirectTo } });
    setBusy(false); setNotice(error ? error.message : kind === "password" ? "If this email has a Blynk account, we sent a password-reset link." : "If this email needs confirmation, we sent a new confirmation link.");
  };
  return <main className="blynk-shell grid min-h-screen place-items-center px-4 py-10"><form onSubmit={(event) => void send("password", event)} className="blynk-card w-full max-w-md rounded-[2rem] p-7"><Link href="/login" className="text-sm font-bold text-pink-300">← Back to sign in</Link><p className="mt-7 text-xs font-bold uppercase tracking-widest text-pink-300">Blynk account help</p><h1 className="mt-2 text-3xl font-black">Restore access</h1><p className="mt-3 text-sm leading-6 text-white/60">Enter your email to receive a secure password-reset link. You can also ask us to resend the account-confirmation email.</p><label className="mt-6 block text-sm font-bold">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none" /></label><button disabled={busy} className="pink-gradient soft-button mt-6 w-full rounded-xl py-3.5 font-bold disabled:opacity-60">{busy ? "Sending…" : "Send password reset"}</button><button disabled={busy} type="button" onClick={() => void send("confirmation")} className="mt-3 w-full rounded-xl border border-white/15 py-3 font-bold text-pink-100 disabled:opacity-60">Resend confirmation email</button>{notice && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-6 text-white/75">{notice}</p>}</form></main>;
}
