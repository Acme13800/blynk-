"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signup" && !accepted) { setNotice("Debes aceptar los Términos y la Política de privacidad."); return; }
    if (!isSupabaseConfigured || !supabase) { setNotice("Agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local para activar el acceso seguro."); return; }
    setBusy(true); setNotice("");
    if (mode === "signup") await supabase.auth.signOut({ scope: "local" });
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/login`, data: { terms_accepted_at: new Date().toISOString() } } });
    setBusy(false);
    if (result.error) { setNotice(result.error.message); return; }
    if (mode === "signup") {
      setNotice("Revisa tu correo para confirmar tu cuenta.");
      return;
    }
    router.replace("/");
  }

  return <main className="blynk-shell grid min-h-screen place-items-center px-4 py-10"><section className="blynk-card w-full max-w-md rounded-[2rem] p-6 sm:p-8"><Link href="/" className="flex items-center gap-2 text-xl font-black"><svg viewBox="0 0 96 58" className="h-7 w-10 drop-shadow-[0_0_8px_#f13ab5]" aria-hidden="true"><path d="M3 29C16 11 31 3 48 3s32 8 45 26C80 47 65 55 48 55S16 47 3 29Z" fill="#f13ab5"/><path d="M13 29C24 18 35 13 48 13s24 5 35 16C72 40 61 45 48 45S24 40 13 29Z" fill="#fff4fb"/><circle cx="48" cy="29" r="11" fill="#18bfc9"/><circle cx="48" cy="29" r="6" fill="#07101e"/><circle cx="44" cy="25" r="2.5" fill="white"/></svg><span>Blynk</span></Link><h1 className="mt-8 text-3xl font-black">{mode === "login" ? "Welcome back" : "Create your account"}</h1><p className="mt-2 text-sm leading-6 text-white/55">Real connections, with control over your profile and privacy.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-bold">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-pink-400" /></label><label className="block text-sm font-bold">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-pink-400" /></label>{mode === "signup" && <label className="flex gap-3 text-xs leading-5 text-white/65"><input checked={accepted} onChange={(event) => setAccepted(event.target.checked)} type="checkbox" className="mt-1 size-4 accent-pink-500" />I accept the <button type="button" onClick={() => setNotice("Before posting, review and accept the Terms, Privacy Policy and Community Guidelines.")} className="text-pink-300 underline">Terms and Conditions</button> and Privacy Policy.</label>}<button disabled={busy} className="soft-button pink-gradient w-full rounded-xl py-3.5 font-bold disabled:opacity-60">{busy ? "Processing…" : mode === "login" ? "Sign in" : "Create secure account"}</button></form>{notice && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">{notice}</p>}<p className="mt-6 text-center text-sm text-white/55">{mode === "login" ? "Don't have an account?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setNotice(""); }} className="font-bold text-pink-300">{mode === "login" ? "Sign up" : "Sign in"}</button></p></section></main>;
}
