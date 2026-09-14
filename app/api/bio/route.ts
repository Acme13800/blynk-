import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "El análisis de biografía aún no está configurado." }, { status: 501 });
}
