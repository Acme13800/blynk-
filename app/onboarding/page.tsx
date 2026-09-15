"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [notice, setNotice] = useState("");

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setNotice("Conecta Supabase primero para guardar el perfil."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setNotice("Inicia sesión antes de crear tu perfil."); return; }
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3) { setNotice("Tu usuario debe tener al menos 3 letras, números o guiones bajos."); return; }
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name.trim(), username: cleanUsername, bio: bio.trim() });
    if (error) { setNotice(error.message); return; }
    setNotice("Perfil guardado. ¡Bienvenido a Blynk!");
    router.replace("/");
  }

  return <main className="blynk-shell grid min-h-screen place-items-center p-4"><form onSubmit={saveProfile} className="blynk-card w-full max-w-md rounded-[2rem] p-7"><Link href="/" className="font-black text-pink-300">◉ Blynk</Link><h1 className="mt-6 text-3xl font-black">Crea tu perfil</h1><p className="mt-2 text-sm text-white/55">Presenta quién eres en pocas palabras. Podrás agregar fotos y video desde tu perfil.</p><label className="mt-6 block text-sm font-bold">Tu nombre<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none" /></label><label className="mt-4 block text-sm font-bold">Nombre de usuario<input value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} placeholder="ejemplo_usuario" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none" /></label><label className="mt-4 block text-sm font-bold">Tu presentación<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-black/20 p-4 outline-none" /></label><button className="pink-gradient soft-button mt-5 w-full rounded-xl py-3.5 font-bold">Guardar y continuar</button>{notice && <p className="mt-4 text-sm text-white/65">{notice}</p>}</form></main>;
}
