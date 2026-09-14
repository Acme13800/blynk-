"use client"
import { useState } from "react"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"

export default function FeedPage() {
  const [activos, setActivos] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const verActivos = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setShow(true)
      setActivos([])
      return
    }
    setLoading(true)
    setShow(true)
    // Quitamos el filtro para probar que trae gente
    const { data, error } = await supabase.from('profiles').select('*').limit(20)
    console.log("DATA:", data, "ERROR:", error)
    setActivos(data || [])
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Feed</h1>
      <button onClick={verActivos} className="bg-black text-white px-6 py-3 rounded-full w-full font-bold">
        {loading ? "Cargando..." : "Ver personas activas 🟢"}
      </button>
      {show && (
        <div className="mt-6">
          <p className="mb-2">Encontrados: {activos.length}</p>
          {activos.map((p:any) => (
            <div key={p.id} className="border p-3 rounded mb-2">
              {p.username || p.email || p.id}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
