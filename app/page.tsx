"use client";
import { useState, useEffect, useRef } from "react";

export default function Blynk(){
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inCall, setInCall] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showPaywall, setShowPaywall] = useState(false);
  const [view, setView] = useState("explore");
  const videoRef = useRef<HTMLVideoElement>(null);

  const gridUsers=[
    {id:1,name:"Sofia, 22",img:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"},
    {id:2,name:"Marcus, 24",img:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"},
    {id:3,name:"Luna, 21",img:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"},
    {id:4,name:"Aisha, 23",img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"},
  ];

  useEffect(()=>{
    let t:any;
    if(inCall && timeLeft>0 && !showPaywall){
      t=setTimeout(()=>setTimeLeft(v=>v-1),1000);
    }
    if(inCall && timeLeft===0){
      setShowPaywall(true);
    }
    return ()=>clearTimeout(t);
  },[inCall, timeLeft, showPaywall]);

  const startCall=async(u:any)=>{
    setSelectedUser(u);
    setInCall(true);
    setTimeLeft(60);
    setShowPaywall(false);
    try{
      const s = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
      if(videoRef.current) videoRef.current.srcObject=s;
    }catch(e){ console.log(e) }
  };

  return(
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold"><span className="text-pink-500">👁️</span> BLYNK</h1>
        <div className="bg-zinc-800 px-3 py-1 rounded-full text-sm">100 💎</div>
      </div>

      {inCall && selectedUser ? (
        <div className="flex-1 relative">
          <img src={selectedUser.img} className="absolute inset-0 w-full h-full object-cover" />
          <video ref={videoRef} autoPlay muted className="absolute bottom-4 right-4 w-28 h-36 bg-zinc-900 rounded-xl object-cover border-2 border-white" />
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full">⏱️ {timeLeft}s</div>
          <button onClick={()=>setInCall(false)} className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-600 px-8 py-3 rounded-full font-bold">Colgar</button>
          {showPaywall && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
              <div className="bg-zinc-900 p-6 rounded-2xl text-center w-full max-w-sm">
                <h2 className="text-xl font-bold mb-2">¡Se acabó el tiempo gratis!</h2>
                <p className="text-zinc-400 mb-4">Paga para seguir hablando con {selectedUser.name}</p>
                <button className="w-full bg-pink-600 py-3 rounded-full font-bold mb-3">Pagar 50 💎 por 5 min</button>
                <button onClick={()=>setInCall(false)} className="text-zinc-400">Colgar</button>
              </div>
            </div>
          )}
        </div>
      ):(
        <div className="p-3 grid grid-cols-2 gap-3 flex-1">
          {gridUsers.map(u=>(
            <div key={u.id} onClick={()=>startCall(u)} className="relative rounded-2xl overflow-hidden aspect-[3/4] cursor-pointer">
              <img src={u.img} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black to-transparent">
                <p className="font-bold">{u.name}</p>
                <p className="text-xs text-green-400">● En línea</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-around p-3 border-t border-zinc-800 bg-zinc-950">
        <button onClick={()=>setView("explore")} className={view==="explore"?"text-pink-500":"text-zinc-500"}>Explorar</button>
        <button className="text-zinc-500">Match</button>
        <button className="text-zinc-500">Likes</button>
      </div>
    </div>
  )
}