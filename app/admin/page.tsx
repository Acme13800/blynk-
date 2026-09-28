"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ReportRow = { id: string; reporter_id: string; target_user_id: string | null; reason: string; created_at: string };
type ProfileRow = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; city: string | null; suspended_at: string | null };
type AppealRow = { id: string; user_id: string; reason: string; status: "pending" | "approved" | "denied"; created_at: string; admin_response?: string | null };

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  const loadQueue = async (showFeedback = false) => {
    if (!supabase) return;
    setRefreshing(true);
    try {
      const { data: reportRows, error: reportError } = await supabase.from("reports").select("id, reporter_id, target_user_id, reason, created_at").not("target_user_id", "is", null).order("created_at", { ascending: false }).limit(100);
      if (reportError) { setNotice(reportError.message); return; }
      const rows = (reportRows || []) as ReportRow[];
      const { data: appealRows, error: appealError } = await supabase.from("account_appeals").select("id, user_id, reason, status, created_at, admin_response").eq("status", "pending").order("created_at", { ascending: true }).limit(100);
      if (appealError) { setNotice(appealError.message); return; }
      const pendingAppeals = (appealRows || []) as AppealRow[];
      const ids = [...new Set([...rows.map((report) => report.target_user_id), ...pendingAppeals.map((appeal) => appeal.user_id)].filter(Boolean))] as string[];
      const { data: profileRows, error: profileError } = ids.length ? await supabase.from("profiles").select("id, display_name, username, avatar_url, city, suspended_at").in("id", ids) : { data: [], error: null };
      if (profileError) { setNotice(profileError.message); return; }
      setReports(rows);
      setAppeals(pendingAppeals);
      setProfiles(Object.fromEntries(((profileRows || []) as ProfileRow[]).map((profile) => [profile.id, profile])));
      if (showFeedback) setNotice(rows.length ? `Queue updated: ${rows.length} report${rows.length === 1 ? "" : "s"} found.` : "Queue updated: there are no reports to review.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    async function prepareAdminLogin() {
      if (!isSupabaseConfigured || !supabase) { setNotice("Connect Supabase before opening moderation."); setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setEmail(user.email);
      setChecking(false);
    }
    void prepareAdminLogin();
  }, []);

  const authenticateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || authenticating) return;
    setAuthenticating(true);
    setNotice("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) { setAuthenticating(false); setNotice("We could not verify those credentials. Please try again."); return; }
    const { data: admin, error: adminError } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
    setAuthenticating(false);
    setPassword("");
    if (adminError || !admin) { setNotice("This account is not authorized to access Blynk Admin."); return; }
    setAuthorized(true);
    await loadQueue();
  };

  const groupedReports = useMemo(() => Object.values(reports.reduce<Record<string, { profile: ProfileRow | undefined; reports: ReportRow[] }>>((grouped, report) => {
    if (!report.target_user_id) return grouped;
    grouped[report.target_user_id] ||= { profile: profiles[report.target_user_id], reports: [] };
    grouped[report.target_user_id].profile = profiles[report.target_user_id];
    grouped[report.target_user_id].reports.push(report);
    return grouped;
  }, {})).sort((left, right) => new Set(right.reports.map((report) => report.reporter_id)).size - new Set(left.reports.map((report) => report.reporter_id)).size || new Date(right.reports[0].created_at).getTime() - new Date(left.reports[0].created_at).getTime()), [reports, profiles]);
  const highPriorityCount = groupedReports.filter((group) => new Set(group.reports.map((report) => report.reporter_id)).size >= 3).length;

  useEffect(() => {
    if (!authorized) return;
    const root = document.querySelector("main.blynk-shell .mx-auto.max-w-3xl");
    const header = root?.querySelector("header");
    if (!root || !header) return;
    root.querySelector("[data-blynk-priority-summary]")?.remove();
    root.querySelectorAll("[data-blynk-priority-label]").forEach((label) => label.remove());
    root.querySelectorAll("[data-blynk-report-history]").forEach((history) => history.remove());
    const summary = document.createElement("div");
    summary.dataset.blynkPrioritySummary = "true";
    summary.className = "mt-5 flex flex-wrap items-center gap-2";
    summary.innerHTML = `<span class="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-white/65">${groupedReports.length} open case${groupedReports.length === 1 ? "" : "s"}</span><span class="rounded-full ${highPriorityCount ? "bg-rose-400/20 text-rose-100" : "bg-white/5 text-white/55"} px-3 py-1.5 text-xs font-bold">⚠ ${highPriorityCount} high priority</span><span class="text-xs text-white/40">High priority means 3+ reports from different accounts.</span>`;
    header.after(summary);
    const cards = Array.from(root.querySelectorAll<HTMLElement>("article"));
    cards.forEach((card, index) => {
      const reportHistory = groupedReports[index]?.reports || [];
      const history = document.createElement("details");
      history.dataset.blynkReportHistory = "true";
      history.className = "mt-4 rounded-2xl border border-white/10 bg-black/15 p-3";
      const historyTitle = document.createElement("summary"); historyTitle.className = "cursor-pointer text-sm font-bold text-pink-100"; historyTitle.textContent = `View all ${reportHistory.length} report${reportHistory.length === 1 ? "" : "s"}`;
      const historyList = document.createElement("div"); historyList.className = "mt-3 space-y-3";
      reportHistory.forEach((report, reportIndex) => { const item = document.createElement("div"); item.className = "border-t border-white/10 pt-3 first:border-0 first:pt-0"; const reason = document.createElement("p"); reason.className = "text-sm text-white/75"; reason.textContent = report.reason; const date = document.createElement("p"); date.className = "mt-1 text-xs text-white/40"; date.textContent = `Report ${reportIndex + 1} · ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.created_at))} · Reporter protected`; item.append(reason, date); historyList.appendChild(item); });
      history.append(historyTitle, historyList); card.appendChild(history);
      const reporters = new Set(groupedReports[index]?.reports.map((report) => report.reporter_id) || []).size;
      if (reporters < 3) return;
      card.classList.add("border-rose-300/40");
      const label = document.createElement("span");
      label.dataset.blynkPriorityLabel = "true";
      label.className = "ml-2 rounded-full bg-rose-400/15 px-2 py-1 text-xs font-bold text-rose-200";
      label.textContent = "High priority";
      card.querySelector("h2")?.after(label);
    });
    return () => { summary.remove(); root.querySelectorAll("[data-blynk-priority-label]").forEach((label) => label.remove()); root.querySelectorAll("[data-blynk-report-history]").forEach((history) => history.remove()); };
  }, [authorized, groupedReports, highPriorityCount]);

  useEffect(() => {
    if (!authorized) return;
    const root = document.querySelector("main.blynk-shell .mx-auto.max-w-3xl");
    if (!root) return;
    root.querySelector("[data-blynk-appeals]")?.remove();
    const section = document.createElement("section");
    section.dataset.blynkAppeals = "true";
    section.className = "mt-6 rounded-3xl border border-white/10 bg-white/[.03] p-5";
    const heading = document.createElement("div"); heading.className = "flex items-center justify-between gap-3";
    const title = document.createElement("h2"); title.className = "font-black"; title.textContent = "Account review requests";
    const count = document.createElement("span"); count.className = "rounded-full bg-pink-400/15 px-3 py-1 text-xs font-bold text-pink-200"; count.textContent = `${appeals.length} pending`;
    heading.append(title, count); section.appendChild(heading);
    if (!appeals.length) { const empty = document.createElement("p"); empty.className = "mt-3 text-sm text-white/50"; empty.textContent = "There are no account review requests."; section.appendChild(empty); }
    appeals.forEach((appeal) => { const profile = profiles[appeal.user_id]; const card = document.createElement("article"); card.className = "mt-4 rounded-2xl bg-black/20 p-4"; const name = document.createElement("p"); name.className = "font-bold"; name.textContent = profile?.display_name || "Blynk user"; const meta = document.createElement("p"); meta.className = "mt-1 text-xs text-white/45"; meta.textContent = `@${profile?.username || "unknown"} · ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(appeal.created_at))}`; const reason = document.createElement("p"); reason.className = "mt-3 whitespace-pre-wrap text-sm leading-6 text-white/70"; reason.textContent = appeal.reason; const response = document.createElement("textarea"); response.className = "mt-4 min-h-24 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-white outline-none"; response.maxLength = 1000; response.placeholder = "Optional private response shown only to this member"; const actions = document.createElement("div"); actions.className = "mt-3 flex flex-wrap gap-2"; const deny = document.createElement("button"); deny.className = "rounded-xl border border-white/15 px-4 py-2 text-sm font-bold"; deny.textContent = "Send response & deny"; deny.addEventListener("click", () => void resolveAppeal(appeal, false, response.value)); const approve = document.createElement("button"); approve.className = "rounded-xl bg-emerald-400/20 px-4 py-2 text-sm font-bold text-emerald-100"; approve.textContent = "Send response & restore"; approve.addEventListener("click", () => void resolveAppeal(appeal, true, response.value)); actions.append(deny, approve); card.append(name, meta, reason, response, actions); section.appendChild(card); });
    const anchor = root.querySelector("[data-blynk-priority-summary]");
    if (anchor) anchor.after(section); else root.querySelector("header")?.after(section);
    return () => section.remove();
  }, [authorized, appeals, profiles]);

  const setSuspension = async (profileId: string, suspended: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.from("profiles").update({ suspended_at: suspended ? new Date().toISOString() : null }).eq("id", profileId);
    if (error) { setNotice(error.message); return; }
    const { error: noticeError } = await supabase.from("account_notices").insert({ user_id: profileId, notice_type: suspended ? "profile_suspended" : "profile_restored" });
    if (noticeError) { setNotice(`Profile updated, but the notice could not be sent: ${noticeError.message}`); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: auditError } = await supabase.from("moderation_actions").insert({ admin_id: user.id, target_user_id: profileId, action: suspended ? "suspended" : "restored" });
      if (auditError) { setNotice(`Profile updated, but the audit record could not be saved: ${auditError.message}`); return; }
    }
    setProfiles((items) => ({ ...items, [profileId]: { ...items[profileId], suspended_at: suspended ? new Date().toISOString() : null } }));
    setNotice(suspended ? "Profile suspended. It is now hidden from Discover." : "Profile restored.");
  };
  const resolveAppeal = async (appeal: AppealRow, approved: boolean, adminResponse = "") => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (approved) await setSuspension(appeal.user_id, false);
    const { error } = await supabase.from("account_appeals").update({ status: approved ? "approved" : "denied", admin_response: adminResponse.trim() || null, responded_at: new Date().toISOString(), reviewed_at: new Date().toISOString(), reviewed_by: user.id, responded_by: user.id }).eq("id", appeal.id);
    if (error) { setNotice(error.message); return; }
    if (!approved) {
      const { error: noticeError } = await supabase.from("account_notices").insert({ user_id: appeal.user_id, notice_type: "appeal_denied" });
      if (noticeError) { setNotice(`Appeal was denied, but the account notice could not be sent: ${noticeError.message}`); return; }
    }
    setAppeals((items) => items.filter((item) => item.id !== appeal.id));
    setNotice(approved ? "Appeal approved and profile restored." : "Appeal denied.");
  };

  if (checking) return <main className="blynk-shell grid min-h-screen place-items-center p-6 text-white/70">Checking administrator access…</main>;
  if (!authorized) return <main className="blynk-shell grid min-h-screen place-items-center p-6"><form onSubmit={authenticateAdmin} className="blynk-card w-full max-w-md rounded-[2rem] p-7"><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Safety</p><h1 className="mt-3 text-2xl font-black">Administrator sign in</h1><p className="mt-3 text-sm leading-6 text-white/60">For security, enter your administrator email and password again to open the moderation queue.</p><label className="mt-6 block text-sm font-bold">Email<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none" /></label><label className="mt-4 block text-sm font-bold">Password<input required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none" /></label>{notice && <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">{notice}</p>}<button disabled={authenticating} className="pink-gradient soft-button mt-6 w-full rounded-xl py-3.5 font-bold disabled:opacity-60">{authenticating ? "Verifying…" : "Secure sign in"}</button><Link href="/" className="mt-4 block text-center text-sm font-bold text-pink-200">Return to Blynk</Link></form></main>;

  return <main className="blynk-shell min-h-screen px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-3xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Safety</p><h1 className="mt-1 text-3xl font-black">Moderation queue</h1><p className="mt-2 text-sm text-white/55">Review reports and control who appears in Discover.</p></div><div className="flex gap-2"><button disabled={refreshing} onClick={() => void loadQueue(true)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold disabled:cursor-wait disabled:opacity-60">{refreshing ? "Refreshing…" : "Refresh"}</button><Link href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">Open app</Link></div></header>{notice && <p className="mt-5 rounded-xl border border-pink-300/25 bg-pink-400/10 p-3 text-sm text-pink-100">{notice}</p>}<section className="mt-6 space-y-4">{groupedReports.length === 0 ? <div className="blynk-card rounded-3xl p-8 text-center text-white/60">There are no profile reports to review.</div> : groupedReports.map(({ profile, reports: profileReports }) => <article key={profile?.id || profileReports[0].target_user_id} className="blynk-card rounded-3xl p-5"><div className="flex items-start gap-4"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-pink-400 to-violet-600 font-black">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : (profile?.display_name || "B").slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{profile?.display_name || "Deleted profile"}</h2>{profile?.suspended_at && <span className="rounded-full bg-rose-400/15 px-2 py-1 text-xs font-bold text-rose-200">Suspended</span>}</div><p className="mt-1 text-sm text-pink-200">@{profile?.username || "unknown"}{profile?.city ? ` · ${profile.city}` : ""}</p><p className="mt-4 text-sm text-white/65">{profileReports.length} report{profileReports.length === 1 ? "" : "s"} · Latest: {profileReports[0].reason}</p><p className="mt-1 text-xs text-white/40">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(profileReports[0].created_at))}</p><div className="mt-4 flex gap-2"><button onClick={() => void setSuspension(profile?.id || "", !profile?.suspended_at)} disabled={!profile?.id} className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40 ${profile?.suspended_at ? "border border-white/15 bg-white/5" : "bg-rose-500/20 text-rose-100"}`}>{profile?.suspended_at ? "Restore profile" : "Suspend profile"}</button></div></div></div></article>)}</section></div></main>;
}
