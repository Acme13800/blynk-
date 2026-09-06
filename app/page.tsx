"use client";
import { useState, useRef } from "react";

const COUNTRIES = [
  { code: "MX", flag: "🇲🇽", name: "México" }, { code: "ES", flag: "🇪🇸", name: "España" },
  { code: "US", flag: "🇺🇸", name: "USA" }, { code: "CO", flag: "🇨🇴", name: "Colombia" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" }, { code: "BR", flag: "🇧🇷", name: "Brasil" },
  { code: "IT", flag: "🇮🇹", name: "Italia" }, { code: "FR", flag: "🇫🇷", name: "Francia" },
];

export default function BlynkTikTokFixed() {
  const [showFilters, setShowFilters] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<any>(null);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [current, setCurrent] = useState(0);
  const [toast, setToast] = useState("");
  const startY = useRef(0);

  const myProfile = { name:"Tú", age:"26", flag:"🇲🇽", state:"California", photo:"https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200", bio:"Listo para conectar 🔥", height:"175", weight:"70", eyes:"Cafés", hair:"Negro", religion:"Católica", langs:"Español, Inglés" };

  const users = [
    { id:1, name:"Sofía", age:24, flags:["🇲🇽","🇪🇸"], codes:["MX","ES"], bio:"Aventurera & café ☕ ¿Vamos por uno? Me encantan las charlas profundas", tags:["Viajes","Arte"], img:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800", online:true, state:"CDMX", height:165, weight:55, eyes:"Cafés", hair:"Castaño", religion:"Católica", langs:["Español","Inglés"] },
    { id:2, name:"Marcus", age:26, flags:["🇺🇸"], codes:["US"], bio:"Gym y buenas vibras 💪 Busco conexión real", tags:["Gym","Música"], img:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800", online:true, state:"California", height:182, weight:80, eyes:"Azules", hair:"Castaño", religion:"Cristiana", langs:["Inglés"] },
    { id:3, name:"Luna", age:21, flags:["🇨🇴"], codes:["CO"], bio:"Bailarina profesional 🌅 Energía positiva siempre ✨", tags:["Baile","Yoga"], img:"https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800", online:true, state:"Bogotá", height:168, weight:52, eyes:"Verdes", hair:"Negro", religion:"Católica", langs:["Español"] },
    { id:4, name:"Emma", age:23, flags:["🇺🇸"], codes:["US"], bio:"California girl 🌊 Surf y atardeceres", tags:["Surf","Yoga"], img:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800", online:true, state:"California", height:170, weight:58, eyes:"Azules", hair:"Rubio", religion:"Agnóstica", langs:["Inglés","Español"] },
    { id:5, name:"Valentina", age:22, flags:["🇦🇷"], codes:["AR"], bio:"Fotógrafa y viajera 📸", tags:["Foto","Viajes"], img:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800", online:true, state:"Buenos Aires", height:172, weight:54, eyes:"Cafés", hair:"Negro", religion:"Católica", langs:["Español"] },
  ];

  const [filters, setFilters] = useState({ nationalities: [] as string[], religion:"", eyes:"", hair:"", language:"" });
  const filtered = users.filter(u=> filters.nationalities.length===0 || u.codes.some((c:string)=>filters.nationalities.includes(c)));
  const p = filtered[current % filtered.length];

  const next = () => setCurrent(c => (c+1) % filtered.length);
  const prev = () => setCurrent(c => (c-1+filtered.length) % filtered.length);

  const handleTouchStart = (e:any) => startY.current = e.touches[0].clientY;
  const handleTouchEnd = (e:any) => {
    const diff = startY.current - e.changedTouches[0].clientY;
    if(Math.abs(diff) > 50){ if(diff>0) next(); else prev(); }
  };
  const handleWheel = (e:any) => { if(Math.abs(e.deltaY)>30){ if(e.deltaY>0) next(); else prev(); } };

  const handleLike = () => {
    setPendingMatch({
      receiver: p,
      sender: myProfile
    });
  };

  return (
    <div className="h-[100dvh] w-screen bg-black overflow-hidden relative flex" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
      {/* FONDO BORROSO - YA NO HAY NEGRO */}
      <div className="absolute inset-0"><img src={p.img} className="w-full h-full object-cover blur-[40px] brightness-[0.4] scale-110" /><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/80" /></div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto flex h-full">
        {/* IZQUIERDA */}
        <div className="hidden lg:flex w-[350px] p-6 flex-col gap-4">
          <h1 className="text-3xl font-black text-white">🔥Blynk</h1>
          <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 border border-white/20 mt-4">
            <p className="text-white font-bold">🎯 Filtros</p><p className="text-white/60 text-xs mt-1">{filtered.length} personas con video</p>
            <button onClick={()=>setShowFilters(true)} className="w-full mt-4 bg-white text-black font-bold py-3 rounded-full text-sm">Abrir filtros PRO</button>
            <div className="flex flex-wrap gap-2 mt-3">{COUNTRIES.map(c=>{const sel=filters.nationalities.includes(c.code); return <button key={c.code} onClick={()=>setFilters({...filters, nationalities: sel? filters.nationalities.filter(x=>x!==c.code) : [...filters.nationalities, c.code]})} className={`px-3 py-1 rounded-full text-xs border ${sel? 'bg-white text-black border-white' : 'bg-white/10 text-white/60 border-white/10'}`}>{c.flag} {c.code}</button>})}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-4 border border-white/10"><p className="text-white/50 text-xs">TIP</p><p className="text-white text-sm mt-1">👆 Desliza con el dedo<br/>🖱️ Usa la rueda del mouse<br/>⌨️ Usa ↑ ↓ del teclado</p></div>
        </div>

        {/* CENTRO TIKTOK REAL - 1 VIDEO A LA VEZ */}
        <div className="flex-1 flex justify-center items-center p-0 lg:p-6">
          <div className="relative w-full max-w-[400px] h-[100dvh] lg:h-[85vh] lg:rounded-[32px] overflow-hidden bg-black shadow-2xl border-0 lg:border border-white/10">
            <img src={p.img} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />

            <div className="absolute top-0 w-full p-4 flex justify-between z-20"><span className="bg-black/50 backdrop-blur-xl px-3 py-1.5 rounded-full text-white text-xs border border-white/20">📍 {p.state} • LIVE</span><div className="flex gap-2"><button onClick={prev} className="w-8 h-8 bg-black/50 backdrop-blur rounded-full text-white border border-white/20">↑</button><button onClick={next} className="w-8 h-8 bg-black/50 backdrop-blur rounded-full text-white border border-white/20">↓</button></div></div>

            {/* Botones derecha */}
            <div className="absolute right-3 bottom-36 flex flex-col gap-4 z-20"><button className="w-12 h-12 bg-white/15 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 text-white text-xl">❤️</button><button className="w-12 h-12 bg-white/15 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 text-white text-xl">💬</button></div>

            <div className="absolute bottom-0 w-full p-5 pb-8 z-20">
              <div className="flex gap-2 mb-2">{p.flags.map((f,i)=><span key={i} className="text-2xl">{f}</span>)}<span className="bg-green-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">● LIVE</span></div>
              <h2 className="text-white font-black text-[28px]">{p.name}, {p.age}</h2>
              <p className="text-white/70 text-xs mt-1">📏 {p.height}cm • ⚖️ {p.weight}kg • 👁️ {p.eyes} • 🙏 {p.religion}</p>
              <p className="text-white text-[15px] mt-2">{p.bio}</p>
              <div className="flex gap-2 mt-3">{p.tags.map((t:string)=><span key={t} className="bg-white/15 backdrop-blur border border-white/10 text-white text-xs px-3 py-1 rounded-full">{t}</span>)}</div>
              <div className="flex gap-3 mt-5"><button onClick={prev} className="flex-1 h-[52px] rounded-full bg-white/15 backdrop-blur border border-white/20 text-white font-bold text-xl">✕</button><button onClick={handleLike} className="flex-[2] h-[52px] rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold shadow-xl">❤️ Me gusta</button></div>
              <p className="text-white/40 text-[11px] text-center mt-3">Desliza ↑↓ o usa rueda del mouse • {current+1}/{filtered.length}</p>
            </div>
          </div>
        </div>

        {/* DERECHA */}
        <div className="hidden lg:flex w-[350px] p-6 flex-col gap-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-4 border border-white/20"><p className="text-white font-bold">🔥 En vivo ({filtered.length})</p><div className="mt-3 space-y-2">{filtered.map((u,i)=><button key={u.id} onClick={()=>setCurrent(i)} className={`w-full flex gap-3 p-2 rounded-xl border text-left ${i===current? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/70'}`}><img src={u.img} className="w-10 h-10 rounded-full object-cover" /><div><p className="text-xs font-bold">{u.name} • {u.state}</p><p className="text-[10px] opacity-70">{u.height}cm • {u.eyes}</p></div></button>)}</div></div>
        </div>
      </div>

      {/* MODAL ACEPTAR/RECHAZAR CON INFO COMPLETA */}
      {pendingMatch && <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4"><div className="bg-[#16161f] w-full max-w-[380px] rounded-[32px] overflow-hidden border border-white/10">
        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-3 text-center border-b border-white/10"><p className="text-pink-300 text-xs font-bold">💌 ¡Alguien te dio like!</p><p className="text-white/60 text-[11px]">Mira su info completa y decide</p></div>
        <div className="relative h-72"><img src={pendingMatch.sender.photo} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#16161f] to-transparent" /><div className="absolute bottom-3 left-4 right-4"><h2 className="text-white font-black text-2xl">{pendingMatch.sender.name}, {pendingMatch.sender.age} {pendingMatch.sender.flag}</h2><p className="text-white/70 text-xs">📍 {pendingMatch.sender.state} • 📏 {pendingMatch.sender.height}cm • ⚖️ {pendingMatch.sender.weight}kg</p></div></div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-3"><span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">👁️ {pendingMatch.sender.eyes}</span><span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">💇 {pendingMatch.sender.hair}</span><span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">🙏 {pendingMatch.sender.religion}</span><span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">🗣️ {pendingMatch.sender.langs}</span></div>
          <p className="bg-white/5 border border-white/10 p-3 rounded-2xl text-white/80 text-sm">"{pendingMatch.sender.bio}"</p>
          <div className="flex gap-3 mt-5"><button onClick={()=>{setPendingMatch(null); setToast("❌ Rechazado"); setTimeout(()=>setToast(""),2000); next();}} className="flex-1 h-12 rounded-full bg-white/10 border border-white/20 text-white font-bold">✕ Rechazar</button><button onClick={()=>{setPendingMatch(null); setActiveChat(pendingMatch.receiver); setMessages([{from: pendingMatch.receiver.name, text:`¡Hola! Acepté tu match 💖 Soy ${pendingMatch.receiver.name}`}])}} className="flex-1 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold">❤️ Aceptar</button></div>
        </div>
      </div></div>}

      {activeChat && <div className="fixed inset-0 bg-black z-[110] flex justify-center"><div className="w-full max-w-[430px] bg-[#0a0a0f] h-[100dvh] flex flex-col"><div className="p-4 flex gap-3 items-center border-b border-white/10"><button onClick={()=>setActiveChat(null)} className="w-8 h-8 bg-white/10 rounded-full text-white">←</button><img src={activeChat.img} className="w-10 h-10 rounded-full" /><p className="text-white font-bold">{activeChat.name} • {activeChat.state}</p></div><div className="flex-1 p-4 space-y-3 overflow-y-auto">{messages.map((m,i)=><div key={i} className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.from===activeChat.name? 'bg-white/10 text-white' : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white ml-auto'}`}>{m.text}</div>)}</div><div className="p-4 border-t border-white/10 flex gap-2"><input value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder="Escribe..." className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white text-sm outline-none" /><button onClick={()=>{if(newMsg){setMessages([...messages,{from:"Tú",text:newMsg}]); setNewMsg("")}}} className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-white">➤</button></div></div></div>}

      {toast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold z-[120]">{toast}</div>}
    </div>
  );
}