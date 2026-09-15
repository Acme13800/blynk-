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

  return <main className="blynk-shell grid min-h-screen place-items-center px-4 py-10"><section className="blynk-card w-full max-w-md rounded-[2rem] p-6 sm:p-8"><Link href="/" className="text-xl font-black"><span className="text-pink-400">◉</span> Blynk</Link><h1 className="mt-8 text-3xl font-black">{mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}</h1><p className="mt-2 text-sm leading-6 text-white/55">Conexiones reales, con control sobre tu perfil y tu privacidad.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-bold">Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-pink-400" /></label><label className="block text-sm font-bold">Contraseña<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-pink-400" /></label>{mode === "signup" && <label className="flex gap-3 text-xs leading-5 text-white/65"><input checked={accepted} onChange={(event) => setAccepted(event.target.checked)} type="checkbox" className="mt-1 size-4 accent-pink-500" />Acepto los <button type="button" onClick={() => setNotice("Antes de publicar debes revisar y aceptar los Términos, la Política de privacidad y las normas de comunidad.")} className="text-pink-300 underline">Términos y Condiciones</button> y la Política de privacidad.</label>}<button disabled={busy} className="soft-button pink-gradient w-full rounded-xl py-3.5 font-bold disabled:opacity-60">{busy ? "Procesando…" : mode === "login" ? "Ingresar" : "Crear cuenta segura"}</button></form>{notice && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">{notice}</p>}<p className="mt-6 text-center text-sm text-white/55">{mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setNotice(""); }} className="font-bold text-pink-300">{mode === "login" ? "Regístrate" : "Ingresar"}</button></p></section></main>;
}
