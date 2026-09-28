"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ReportRow = { id: string; target_user_id: string | null; reason: string; created_at: string };
type ProfileRow = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; city: string | null; suspended_at: string | null };

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadQueue = async (showFeedback = false) => {
    if (!supabase) return;
    setRefreshing(true);
    try {
      const { data: reportRows, error: reportError } = await supabase.from("reports").select("id, target_user_id, reason, created_at").not("target_user_id", "is", null).order("created_at", { ascending: false }).limit(100);
      if (reportError) { setNotice(reportError.message); return; }
      const rows = (reportRows || []) as ReportRow[];
      const ids = [...new Set(rows.map((report) => report.target_user_id).filter(Boolean))] as string[];
      const { data: profileRows, error: profileError } = ids.length ? await supabase.from("profiles").select("id, display_name, username, avatar_url, city, suspended_at").in("id", ids) : { data: [], error: null };
      if (profileError) { setNotice(profileError.message); return; }
      setReports(rows);
      setProfiles(Object.fromEntries(((profileRows || []) as ProfileRow[]).map((profile) => [profile.id, profile])));
      if (showFeedback) setNotice(rows.length ? `Queue updated: ${rows.length} report${rows.length === 1 ? "" : "s"} found.` : "Queue updated: there are no reports to review.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    async function verifyAdmin() {
      if (!isSupabaseConfigured || !supabase) { setNotice("Connect Supabase before opening moderation."); setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecking(false); return; }
      const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
      const canModerate = Boolean(admin);
      setAuthorized(canModerate);
      setChecking(false);
      if (canModerate) await loadQueue();
    }
    void verifyAdmin();
  }, []);

  const groupedReports = useMemo(() => Object.values(reports.reduce<Record<string, { profile: ProfileRow | undefined; reports: ReportRow[] }>>((grouped, report) => {
    if (!report.target_user_id) return grouped;
    grouped[report.target_user_id] ||= { profile: profiles[report.target_user_id], reports: [] };
    grouped[report.target_user_id].profile = profiles[report.target_user_id];
    grouped[report.target_user_id].reports.push(report);
    return grouped;
  }, {})), [reports, profiles]);

  const setSuspension = async (profileId: string, suspended: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.from("profiles").update({ suspended_at: suspended ? new Date().toISOString() : null }).eq("id", profileId);
    if (error) { setNotice(error.message); return; }
    const { error: noticeError } = await supabase.from("account_notices").insert({ user_id: profileId, notice_type: suspended ? "profile_suspended" : "profile_restored" });
    if (noticeError) { setNotice(`Profile updated, but the notice could not be sent: ${noticeError.message}`); return; }
    setProfiles((items) => ({ ...items, [profileId]: { ...items[profileId], suspended_at: suspended ? new Date().toISOString() : null } }));
    setNotice(suspended ? "Profile suspended. It is now hidden from Discover." : "Profile restored.");
  };

  if (checking) return <main className="blynk-shell grid min-h-screen place-items-center p-6 text-white/70">Checking administrator access…</main>;
  if (!authorized) return <main className="blynk-shell grid min-h-screen place-items-center p-6"><section className="blynk-card w-full max-w-md rounded-[2rem] p-7 text-center"><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Safety</p><h1 className="mt-3 text-2xl font-black">Administrator access required</h1><p className="mt-3 text-sm leading-6 text-white/60">This page is only available to a Blynk administrator.</p><Link href="/" className="pink-gradient soft-button mt-6 inline-block rounded-xl px-5 py-3 font-bold">Return to Blynk</Link></section></main>;

  return <main className="blynk-shell min-h-screen px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-3xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Safety</p><h1 className="mt-1 text-3xl font-black">Moderation queue</h1><p className="mt-2 text-sm text-white/55">Review reports and control who appears in Discover.</p></div><div className="flex gap-2"><button disabled={refreshing} onClick={() => void loadQueue(true)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold disabled:cursor-wait disabled:opacity-60">{refreshing ? "Refreshing…" : "Refresh"}</button><Link href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">Open app</Link></div></header>{notice && <p className="mt-5 rounded-xl border border-pink-300/25 bg-pink-400/10 p-3 text-sm text-pink-100">{notice}</p>}<section className="mt-6 space-y-4">{groupedReports.length === 0 ? <div className="blynk-card rounded-3xl p-8 text-center text-white/60">There are no profile reports to review.</div> : groupedReports.map(({ profile, reports: profileReports }) => <article key={profile?.id || profileReports[0].target_user_id} className="blynk-card rounded-3xl p-5"><div className="flex items-start gap-4"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-pink-400 to-violet-600 font-black">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : (profile?.display_name || "B").slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{profile?.display_name || "Deleted profile"}</h2>{profile?.suspended_at && <span className="rounded-full bg-rose-400/15 px-2 py-1 text-xs font-bold text-rose-200">Suspended</span>}</div><p className="mt-1 text-sm text-pink-200">@{profile?.username || "unknown"}{profile?.city ? ` · ${profile.city}` : ""}</p><p className="mt-4 text-sm text-white/65">{profileReports.length} report{profileReports.length === 1 ? "" : "s"} · Latest: {profileReports[0].reason}</p><p className="mt-1 text-xs text-white/40">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(profileReports[0].created_at))}</p><div className="mt-4 flex gap-2"><button onClick={() => void setSuspension(profile?.id || "", !profile?.suspended_at)} disabled={!profile?.id} className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40 ${profile?.suspended_at ? "border border-white/15 bg-white/5" : "bg-rose-500/20 text-rose-100"}`}>{profile?.suspended_at ? "Restore profile" : "Suspend profile"}</button></div></div></div></article>)}</section></div></main>;
}
