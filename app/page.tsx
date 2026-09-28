"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Tab = "discover" | "community" | "messages" | "profile";
type Language = "es" | "en";
type CommunityComment = { id: string | number; content: string; author: string; authorId?: string; createdAt?: string; parentId?: string | null; hidden?: boolean };
type CommunityPost = { id: string | number; author: string; authorId?: string; initial: string; time: string; text: string; video?: string; likes: number; commentsEnabled: boolean; comments: CommunityComment[] };
type StoredPost = { id: string; user_id: string; caption: string | null; video_url: string | null; comments_enabled?: boolean | null; created_at: string; profiles: { display_name: string }[] | null };
type StoredComment = { id: string; post_id: string; user_id: string; content: string; created_at: string; parent_id?: string | null; hidden_at?: string | null; profiles: { display_name: string }[] | null };
type StoredLike = { post_id: string };
type ChatMessage = { id: string; from: string; text: string; createdAt: string; readAt?: string | null; mediaUrl?: string; mediaType?: "image" | "video" };
type InboxPreview = { content: string; createdAt: string; unread: boolean };
type DiscoverPerson = { id: string; name: string; age: number; place: string; emoji: string; accent: string; intro: string; tags: string[]; intent?: string; video: string; avatarUrl?: string; likeCount?: number; likedByMe?: boolean };
type MatchRequest = { id: string; otherId: string; otherName: string; otherBio?: string; otherAvatarUrl?: string; otherVideoUrl?: string; incoming: boolean; status: "pending" | "accepted" | "rejected" };
type SafetyAction = { kind: "report" | "block"; targetId: string; targetName: string; closeConversation?: boolean };
type AccountNotice = { id: string; notice_type: "profile_suspended" | "profile_restored" | "appeal_denied" };
type BlockedProfile = { id: string; name: string; avatarUrl: string; reason: string };

const people: DiscoverPerson[] = [
  { id: "sofia", name: "Sofía", age: 24, place: "Ciudad de México", emoji: "☕", accent: "from-orange-400 via-rose-500 to-violet-700", intro: "Una caminata, un café y una conversación sin prisa.", tags: ["Travel", "Photography", "Coffee"], intent: "Intentional dating", video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
  { id: "mila", name: "Mila", age: 26, place: "Barcelona", emoji: "🎨", accent: "from-fuchsia-600 via-purple-600 to-sky-700", intro: "Arte, mar y una playlist que cambia cada viernes.", tags: ["Art", "Music", "Yoga"], intent: "New friendships", video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
  { id: "camila", name: "Camila", age: 25, place: "Medellín", emoji: "🌿", accent: "from-emerald-500 via-teal-700 to-slate-900", intro: "Me gusta descubrir lugares nuevos y reír sin filtros.", tags: ["Outdoors", "Movies", "Food"], intent: "Open to meeting people", video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
];

const copy = {
  es: { discover: "Descubrir", community: "Comunidad", messages: "Mensajes", profile: "Perfil", forYou: "Para ti", nearby: "Cerca", request: "Solicitar match", skip: "Siguiente", swipe: "Desliza hacia arriba para ver otro video", share: "Comparte más allá de las citas", publish: "Publicar", thought: "¿Qué estás pensando?", addVideo: "Agregar video", comments: "Comentarios", comment: "Comentar", send: "Enviar", public: "Público", private: "Privado", hidden: "Oculto", edit: "Editar", delete: "Borrar", settings: "Ajustes", logOut: "Cerrar sesión", gallery: "Galería", addMedia: "Agregar fotos o videos", matched: "¡Solicitud enviada!", profileReady: "Tu perfil", report: "Reportar", block: "Bloquear", hide: "Esconder", reply: "Responder", copy: "Copiar", disableComments: "Desactivar comentarios" },
  en: { discover: "Discover", community: "Community", messages: "Messages", profile: "Profile", forYou: "For you", nearby: "Nearby", request: "Request match", skip: "Next", swipe: "Swipe up for another video", share: "Share beyond dating", publish: "Publish", thought: "What are you thinking?", addVideo: "Add video", comments: "Comments", comment: "Comment", send: "Send", public: "Public", private: "Private", hidden: "Hidden", edit: "Edit", delete: "Delete", settings: "Settings", logOut: "Log out", gallery: "Gallery", addMedia: "Add photos or videos", matched: "Match request sent!", profileReady: "Your profile", report: "Report", block: "Block", hide: "Hide", reply: "Reply", copy: "Copy", disableComments: "Disable comments" },
};

export default function BlynkHome() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("discover");
  const [language, setLanguage] = useState<Language>("en");
  const [personIndex, setPersonIndex] = useState(0);
  const [toast, setToast] = useState("");
  const [incomingAlert, setIncomingAlert] = useState<{ name: string; hasMedia: boolean } | null>(null);
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([{ id: 1, author: "Luis Hernandez", initial: "L", time: "Ahora", text: "Busco una conversación honesta. ¿Cuál es el mejor consejo que te han dado?", likes: 4, commentsEnabled: true, comments: [{ id: "welcome-comment", content: "Me encanta esa pregunta ✨", author: "Blynk member" }] }]);
  const [postVideo, setPostVideo] = useState("");
  const [postVideoFile, setPostVideoFile] = useState<File | null>(null);
  const [uploadingPost, setUploadingPost] = useState(false);
  const [comment, setComment] = useState("");
  const [menu, setMenu] = useState<string | number | null>(null);
  const [commentMenu, setCommentMenu] = useState<string | number | null>(null);
  const [replyTo, setReplyTo] = useState<{ postId: string | number; commentId: string | number; author: string } | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [messageMediaFile, setMessageMediaFile] = useState<File | null>(null);
  const [messageMediaPreview, setMessageMediaPreview] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [media, setMedia] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState("Público");
  const [registeredPeople, setRegisteredPeople] = useState<DiscoverPerson[]>([]);
  const [discoverMode, setDiscoverMode] = useState<"forYou" | "nearby">("forYou");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ageRange, setAgeRange] = useState({ min: 18, max: 60 });
  const [cityFilter, setCityFilter] = useState("");
  const [interestFilter, setInterestFilter] = useState("");
  const [intentFilter, setIntentFilter] = useState("");
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const [inboxMatchIds, setInboxMatchIds] = useState<string[]>([]);
  const [inboxPreviews, setInboxPreviews] = useState<Record<string, InboxPreview>>({});
  const [activeMatch, setActiveMatch] = useState<MatchRequest | null>(null);
  const [viewingProfile, setViewingProfile] = useState<{ person: DiscoverPerson; media: string[] } | null>(null);
  const [previewingOwnProfile, setPreviewingOwnProfile] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<MatchRequest | null>(null);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [presentationVideo, setPresentationVideo] = useState("");
  const [presentationVideoFile, setPresentationVideoFile] = useState<File | null>(null);
  const [uploadingPresentation, setUploadingPresentation] = useState(false);
  const [safetyAction, setSafetyAction] = useState<SafetyAction | null>(null);
  const [safetyReason, setSafetyReason] = useState("");
  const [accountNotice, setAccountNotice] = useState<AccountNotice | null>(null);
  const [accountSuspended, setAccountSuspended] = useState(false);
  const [blockedProfiles, setBlockedProfiles] = useState<BlockedProfile[]>([]);
  const [blockedListOpen, setBlockedListOpen] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [myProfile, setMyProfile] = useState({ displayName: "", username: "", bio: "", email: "", avatarUrl: "", coverUrl: "", presentationVideoUrl: "", city: "", connectionIntent: "", interests: [] as string[] });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const startY = useRef(0);
  const t = copy[language];
  const profileAge = (birthDate?: string | null) => { if (!birthDate) return 18; const birth = new Date(`${birthDate}T00:00:00`); const today = new Date(); return today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0); };
  const candidatePeople = registeredPeople.length ? registeredPeople : people;
  const effectiveCity = discoverMode === "nearby" ? myProfile.city : cityFilter;
  const discoverPeople = candidatePeople.filter((profile) => profile.age >= ageRange.min && profile.age <= ageRange.max && (!effectiveCity.trim() || profile.place.toLowerCase() === effectiveCity.trim().toLowerCase()) && (!interestFilter || profile.tags.includes(interestFilter)) && (!intentFilter || profile.intent === intentFilter));
  const availableInterests = [...new Set(candidatePeople.flatMap((profile) => profile.tags))].sort();
  const person = discoverPeople[personIndex % discoverPeople.length];
  const conversationName = activeMatch?.otherName || (language === "es" ? "Selecciona un match" : "Select a match");
  const hasReceivedMessage = chat.some((item) => item.from !== "me");

  const notify = (value: string) => { setToast(value); window.setTimeout(() => setToast(""), 2600); };
  const beginSafetyAction = (action: SafetyAction) => {
    if (action.targetId.length < 20) { notify(language === "es" ? "Este es un perfil de demostración. Usa una cuenta registrada para probar esta función." : "This is a demo profile. Use a registered account to test this feature."); return; }
    setSafetyReason("");
    setSafetyAction(action);
  };
  const requireActiveAccount = () => {
    if (!accountSuspended) return true;
    notify(language === "es" ? "Tu cuenta está suspendida mientras se revisa. No puedes realizar esta acción." : "Your account is suspended while under review. You cannot perform this action.");
    return false;
  };
  const dismissAccountNotice = async () => {
    if (!accountNotice || !supabase) return;
    const notice = accountNotice;
    setAccountNotice(null);
    await supabase.from("account_notices").update({ read_at: new Date().toISOString() }).eq("id", notice.id);
  };
  const unblockProfile = async (profileId: string) => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", profileId);
    if (error) { notify(error.message); return; }
    setBlockedProfiles((items) => items.filter((item) => item.id !== profileId));
    notify(language === "es" ? "Persona desbloqueada." : "Person unblocked.");
  };
  const submitAppeal = async (providedReason = appealReason) => {
    const reason = providedReason.trim();
    if (!supabase || reason.length < 20 || submittingAppeal) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSubmittingAppeal(true);
    const { error } = await supabase.from("account_appeals").insert({ user_id: user.id, reason });
    setSubmittingAppeal(false);
    if (error) { notify(error.code === "23505" ? (language === "es" ? "Ya tienes una solicitud de revisión pendiente." : "You already have a review request pending.") : error.message); return; }
    setAppealOpen(false);
    setAppealReason("");
    notify(language === "es" ? "Tu solicitud de revisión fue enviada." : "Your review request was sent.");
  };
  const messageTime = (date: string) => new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(date));
  const nextPerson = () => setPersonIndex((value) => (value + 1) % discoverPeople.length);
  const toggleProfileLike = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!requireActiveAccount()) return;
    if (!supabase || person.id.length < 20) { notify(language === "es" ? "Inicia sesión para dar me gusta." : "Sign in to like profiles."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para dar me gusta." : "Sign in to like profiles."); return; }
    const liked = Boolean(person.likedByMe);
    const query = supabase.from("profile_likes");
    const { error } = liked ? await query.delete().eq("profile_id", person.id).eq("user_id", user.id) : await query.insert({ profile_id: person.id, user_id: user.id });
    if (error) { notify(error.message); return; }
    setRegisteredPeople((profiles) => profiles.map((profile) => profile.id === person.id ? { ...profile, likedByMe: !liked, likeCount: Math.max(0, (profile.likeCount || 0) + (liked ? -1 : 1)) } : profile));
  };
  const skipProfile = async () => {
    if (!person) return;
    if (!supabase || person.id.length < 20) { nextPerson(); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para descartar perfiles." : "Sign in to skip profiles."); return; }
    const { error } = await supabase.from("profile_skips").upsert({ profile_id: person.id, user_id: user.id }, { onConflict: "user_id,profile_id", ignoreDuplicates: true });
    if (error) { notify(language === "es" ? `No se pudo descartar el perfil: ${error.message}` : `Could not skip this profile: ${error.message}`); return; }
    setRegisteredPeople((profiles) => profiles.filter((profile) => profile.id !== person.id));
    setPersonIndex(0);
    notify(language === "es" ? "Perfil descartado." : "Profile skipped.");
  };
  const blockProfile = async () => {
    if (!person) return;
    beginSafetyAction({ kind: "block", targetId: person.id, targetName: person.name });
  };
  const reportProfile = async () => {
    if (!person) return;
    beginSafetyAction({ kind: "report", targetId: person.id, targetName: person.name });
  };
  const openPublicProfile = async (selected: DiscoverPerson) => {
    setViewingProfile({ person: selected, media: [] });
    if (!supabase || selected.id.length < 20) return;
    const { data } = await supabase.from("profile_media").select("media_url").eq("user_id", selected.id).order("created_at", { ascending: true }).limit(6);
    setViewingProfile({ person: selected, media: (data || []).map((item) => item.media_url) });
  };
  const onTouchStart = (event: React.TouchEvent) => { startY.current = event.touches[0].clientY; };
  const onTouchEnd = (event: React.TouchEvent) => { if (startY.current - event.changedTouches[0].clientY > 55) void skipProfile(); };
  const addPost = async () => {
    if (!requireActiveAccount()) return;
    if ((!postText.trim() && !postVideo) || uploadingPost) return;
    let publishedVideo = postVideo;
    setUploadingPost(true);
    if (postVideoFile && isSupabaseConfigured && supabase) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { setUploadingPost(false); notify(language === "es" ? "Inicia sesión para publicar un video." : "Sign in to publish a video."); return; }
      const extension = postVideoFile.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("blynk-media").upload(path, postVideoFile, { contentType: postVideoFile.type, upsert: false });
      if (uploadError) { setUploadingPost(false); notify(`${language === "es" ? "No se pudo subir el video" : "Video upload failed"}: ${uploadError.message}`); return; }
      publishedVideo = supabase.storage.from("blynk-media").getPublicUrl(path).data.publicUrl;
      const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, display_name: user.user_metadata.display_name || user.email?.split("@")[0] || "Blynk user" });
      if (profileError) { setUploadingPost(false); notify(`${language === "es" ? "No se pudo preparar tu perfil" : "Could not prepare your profile"}: ${profileError.message}`); return; }
      const { error: postError } = await supabase.from("posts").insert({ user_id: user.id, caption: postText.trim() || null, video_url: publishedVideo });
      if (postError) { setUploadingPost(false); notify(`${language === "es" ? "Video subido, pero no se pudo guardar la publicación" : "Video uploaded, but the post could not be saved"}: ${postError.message}`); return; }
    }
    setPosts((items) => [{ id: Date.now(), author: myProfile.displayName || "Blynk user", initial: (myProfile.displayName || "B").slice(0, 1).toUpperCase(), time: language === "es" ? "Ahora" : "Now", text: postText.trim(), video: publishedVideo || undefined, likes: 0, commentsEnabled: true, comments: [] }, ...items]);
    setPostText(""); setPostVideo(""); setPostVideoFile(null); setUploadingPost(false);
    notify(language === "es" ? "Publicación compartida" : "Post shared");
  };
  const addComment = async (postId: string | number) => {
    if (!requireActiveAccount()) return;
    const content = comment.trim();
    if (!content) return;
    if (isSupabaseConfigured && supabase && typeof postId === "string") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { notify(language === "es" ? "Inicia sesión para comentar." : "Sign in to comment."); return; }
      const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content, parent_id: replyTo?.postId === postId && typeof replyTo.commentId === "string" ? replyTo.commentId : null });
      if (error) { notify(`${language === "es" ? "No se pudo publicar el comentario" : "Could not post the comment"}: ${error.message}`); return; }
    }
    setPosts((items) => items.map((post) => post.id === postId ? { ...post, comments: [...post.comments, { id: Date.now(), content, author: myProfile.displayName || "You", parentId: replyTo?.postId === postId ? String(replyTo.commentId) : null }] } : post));
    setComment(""); setReplyTo(null);
  };
  const updateCommentsEnabled = async (post: CommunityPost) => {
    const nextEnabled = !post.commentsEnabled;
    if (supabase && typeof post.id === "string") {
      const { error } = await supabase.from("posts").update({ comments_enabled: nextEnabled }).eq("id", post.id);
      if (error) { notify(error.message); return; }
    }
    setPosts((items) => items.map((item) => item.id === post.id ? { ...item, commentsEnabled: nextEnabled } : item)); setMenu(null);
    notify(nextEnabled ? (language === "es" ? "Comentarios activados" : "Comments enabled") : (language === "es" ? "Comentarios desactivados" : "Comments disabled"));
  };
  const runCommentAction = async (post: CommunityPost, entry: CommunityComment, action: "reply" | "copy" | "hide" | "delete" | "report" | "block") => {
    if (action === "reply") { setReplyTo({ postId: post.id, commentId: entry.id, author: entry.author }); setComment(`@${entry.author} `); setCommentMenu(null); return; }
    if (action === "copy") { try { await navigator.clipboard.writeText(entry.content); notify(language === "es" ? "Comentario copiado" : "Comment copied"); } catch { notify(language === "es" ? "No se pudo copiar el comentario" : "Could not copy the comment"); } setCommentMenu(null); return; }
    if (!supabase || typeof entry.id !== "string") { notify(language === "es" ? "Esta acción estará disponible en publicaciones guardadas." : "This action is available on saved posts."); setCommentMenu(null); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para administrar comentarios." : "Sign in to manage comments."); return; }
    let error: { message: string } | null = null;
    if (action === "delete") ({ error } = await supabase.from("comments").delete().eq("id", entry.id));
    if (action === "hide") ({ error } = await supabase.from("comments").update({ hidden_at: new Date().toISOString(), hidden_by: user.id }).eq("id", entry.id));
    if (action === "report") ({ error } = await supabase.from("comment_reports").upsert({ comment_id: entry.id, reporter_id: user.id, reason: "User report" }, { onConflict: "comment_id,reporter_id" }));
    if (action === "block" && entry.authorId) ({ error } = await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id: entry.authorId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true }));
    if (error) { notify(error.message); return; }
    if (action === "delete" || action === "hide") setPosts((items) => items.map((item) => item.id === post.id ? { ...item, comments: item.comments.filter((commentItem) => commentItem.id !== entry.id) } : item));
    notify(action === "delete" ? (language === "es" ? "Comentario eliminado" : "Comment deleted") : action === "hide" ? (language === "es" ? "Comentario oculto" : "Comment hidden") : action === "report" ? (language === "es" ? "Comentario reportado" : "Comment reported") : (language === "es" ? "Usuario bloqueado" : "User blocked")); setCommentMenu(null);
  };
  const addLike = async (postId: string | number) => {
    if (isSupabaseConfigured && supabase && typeof postId === "string") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { notify(language === "es" ? "Inicia sesión para dar me gusta." : "Sign in to like posts."); return; }
      const { error } = await supabase.from("likes").upsert({ user_id: user.id, post_id: postId }, { onConflict: "user_id,post_id", ignoreDuplicates: true });
      if (error) { notify(`${language === "es" ? "No se pudo guardar el me gusta" : "Could not save the like"}: ${error.message}`); return; }
    }
    setPosts((items) => items.map((post) => post.id === postId ? { ...post, likes: post.likes + 1 } : post));
  };
  const loadMatches = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("match_requests").select("id, sender_id, recipient_id, status").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at", { ascending: false });
    if (!data?.length) { setMatchRequests([]); setInboxMatchIds([]); return; }
    const otherIds = data.map((request) => request.sender_id === user.id ? request.recipient_id : request.sender_id);
    const { data: profileRows } = await supabase.from("profiles").select("id, display_name, bio, avatar_url, presentation_video_url").in("id", otherIds);
    const profileById = new Map((profileRows || []).map((profile) => [profile.id, profile]));
    const parsedRequests = data.map((request) => { const otherId = request.sender_id === user.id ? request.recipient_id : request.sender_id; const profile = profileById.get(otherId); return { id: request.id, otherId, otherName: profile?.display_name || "Blynk user", otherBio: profile?.bio || "", otherAvatarUrl: profile?.avatar_url || "", otherVideoUrl: profile?.presentation_video_url || "", incoming: request.recipient_id === user.id, status: request.status as MatchRequest["status"] }; });
    const uniqueRequests = Array.from(parsedRequests.reduce((items, request) => { const current = items.get(request.otherId); const score = (value: MatchRequest) => value.status === "accepted" ? 3 : value.status === "pending" ? 2 : 1; if (!current || score(request) > score(current)) items.set(request.otherId, request); return items; }, new Map<string, MatchRequest>()).values());
    setMatchRequests(uniqueRequests);
    const acceptedIds = uniqueRequests.filter((request) => request.status === "accepted").map((request) => request.otherId);
    if (!acceptedIds.length) { setInboxMatchIds([]); setInboxPreviews({}); return; }
    const { data: inboxRows } = await supabase.from("messages").select("sender_id, content, created_at, read_at").eq("receiver_id", user.id).in("sender_id", acceptedIds).order("created_at", { ascending: false });
    const previewById: Record<string, InboxPreview> = {};
    for (const row of inboxRows || []) if (!previewById[row.sender_id]) previewById[row.sender_id] = { content: row.content || "", createdAt: row.created_at, unread: !row.read_at };
    setInboxMatchIds(Object.keys(previewById));
    setInboxPreviews(previewById);
  };
  const requestMatch = async () => {
    if (!requireActiveAccount()) return;
    if (!registeredPeople.length) { notify(language === "es" ? "Para solicitar un match, crea una segunda cuenta de prueba o espera a que haya otros perfiles registrados." : "To request a match, create a second test account or wait for other registered profiles."); return; }
    if (!isSupabaseConfigured || !supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para solicitar un match." : "Sign in to request a match."); return; }
    const { data: existingMatch } = await supabase.from("match_requests").select("id, status").or(`and(sender_id.eq.${user.id},recipient_id.eq.${person.id}),and(sender_id.eq.${person.id},recipient_id.eq.${user.id})`).limit(1).maybeSingle();
    if (existingMatch) { notify(existingMatch.status === "accepted" ? (language === "es" ? "Ya tienes un match con esta persona." : "You already have a match with this person.") : (language === "es" ? "Ya existe una solicitud con esta persona." : "A request already exists with this person.")); return; }
    const { error } = await supabase.from("match_requests").upsert({ sender_id: user.id, recipient_id: person.id, status: "pending" }, { onConflict: "sender_id,recipient_id" });
    if (error) { notify(`${language === "es" ? "No se pudo enviar la solicitud" : "Could not send the request"}: ${error.message}`); return; }
    notify(t.matched); void loadMatches();
  };
  const respondToMatch = async (request: MatchRequest, status: "accepted" | "rejected") => {
    if (!requireActiveAccount()) return;
    if (!supabase) return;
    const { error } = await supabase.from("match_requests").update({ status, responded_at: new Date().toISOString() }).eq("id", request.id);
    if (error) { notify(error.message); return; }
    notify(status === "accepted" ? (language === "es" ? "Match aceptado. Ya pueden conversar." : "Match accepted. You can now chat.") : (language === "es" ? "Solicitud rechazada." : "Request rejected."));
    void loadMatches();
  };
  const signOut = async () => {
    if (supabase) await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
  };
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Tu sesión terminó. Ingresa de nuevo." : "Your session ended. Sign in again."); return; }
    const username = myProfile.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (myProfile.displayName.trim().length < 2 || username.length < 3) { notify(language === "es" ? "Agrega un nombre y usuario válidos." : "Add a valid name and username."); return; }
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: myProfile.displayName.trim(), username, bio: myProfile.bio.trim(), city: myProfile.city.trim() || null, connection_intent: myProfile.connectionIntent || null, interests: myProfile.interests });
    setSavingProfile(false);
    if (error) { notify(error.message); return; }
    setMyProfile((profile) => ({ ...profile, username }));
    setEditingProfile(false);
    notify(language === "es" ? "Perfil actualizado." : "Profile updated.");
  };
  const openConversation = async (request: MatchRequest) => {
    setTab("messages");
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("messages").select("id, sender_id, content, media_url, media_type, created_at, read_at").or(`and(sender_id.eq.${user.id},receiver_id.eq.${request.otherId}),and(sender_id.eq.${request.otherId},receiver_id.eq.${user.id})`).order("created_at", { ascending: true });
    const loadedMessages = (data || []).map((item) => ({ id: item.id, from: item.sender_id === user.id ? "me" : request.otherName, text: item.content || "", mediaUrl: item.media_url || undefined, mediaType: item.media_type || undefined, createdAt: item.created_at, readAt: item.read_at }));
    await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("sender_id", request.otherId).eq("receiver_id", user.id).is("read_at", null);
    setChat(loadedMessages);
    setActiveMatch(request);
  };
  const openConversationProfile = async () => {
    if (!activeMatch) return;
    const fallback: DiscoverPerson = { id: activeMatch.otherId, name: activeMatch.otherName, age: 18, place: language === "es" ? "Ciudad no especificada" : "City not specified", emoji: "✦", accent: "from-pink-500 via-fuchsia-600 to-violet-700", intro: activeMatch.otherBio || (language === "es" ? "Esta persona aún no añadió una biografía." : "This person has not added a bio yet."), tags: [], intent: "", video: activeMatch.otherVideoUrl || "", avatarUrl: activeMatch.otherAvatarUrl || "" };
    setViewingProfile({ person: fallback, media: [] });
    if (!supabase) return;
    const [{ data: profile }, { data: gallery }] = await Promise.all([
      supabase.from("profiles").select("display_name, bio, avatar_url, presentation_video_url, city, birth_date, interests, connection_intent").eq("id", activeMatch.otherId).maybeSingle(),
      supabase.from("profile_media").select("media_url").eq("user_id", activeMatch.otherId).order("created_at", { ascending: true }).limit(6),
    ]);
    if (!profile) return;
    setViewingProfile({ person: { ...fallback, name: profile.display_name || fallback.name, age: profileAge(profile.birth_date), place: profile.city || fallback.place, intro: profile.bio || fallback.intro, tags: profile.interests?.length ? profile.interests : [], intent: profile.connection_intent || "", video: profile.presentation_video_url || "", avatarUrl: profile.avatar_url || "" }, media: (gallery || []).map((item) => item.media_url) });
  };
  const reportConversationProfile = async () => {
    if (!activeMatch) return;
    beginSafetyAction({ kind: "report", targetId: activeMatch.otherId, targetName: activeMatch.otherName, closeConversation: true });
  };
  const blockConversationProfile = async () => {
    if (!activeMatch) return;
    beginSafetyAction({ kind: "block", targetId: activeMatch.otherId, targetName: activeMatch.otherName, closeConversation: true });
  };
  const submitSafetyAction = async () => {
    if (!safetyAction || !safetyReason || !supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para continuar." : "Sign in to continue."); return; }
    const { kind, targetId, closeConversation } = safetyAction;
    const { error } = kind === "report"
      ? await supabase.from("reports").insert({ reporter_id: user.id, target_user_id: targetId, reason: safetyReason })
      : await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id: targetId, reason: safetyReason }, { onConflict: "blocker_id,blocked_id" });
    if (error) { notify(error.message); return; }
    if (kind === "block") {
      setRegisteredPeople((profiles) => profiles.filter((profile) => profile.id !== targetId));
      setPersonIndex(0);
      if (closeConversation) {
        setMatchRequests((items) => items.filter((item) => item.otherId !== targetId));
        setInboxMatchIds((items) => items.filter((id) => id !== targetId));
        setActiveMatch(null);
        setChat([]);
      }
    }
    setSafetyAction(null);
    setSafetyReason("");
    notify(kind === "block" ? (language === "es" ? "Persona bloqueada. No volverá a aparecer." : "Person blocked. They will not appear again.") : (language === "es" ? "Reporte enviado. Gracias por ayudarnos a cuidar Blynk." : "Report sent. Thanks for helping keep Blynk safe."));
  };
  const selectPresentationVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { notify(language === "es" ? "Elige un archivo de video." : "Choose a video file."); return; }
    setPresentationVideoFile(file);
    setPresentationVideo(URL.createObjectURL(file));
  };
  const savePresentationVideo = async () => {
    if (!presentationVideoFile || !supabase || uploadingPresentation) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para guardar tu video." : "Sign in to save your video."); return; }
    setUploadingPresentation(true);
    const extension = presentationVideoFile.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${user.id}/presentation/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("blynk-media").upload(path, presentationVideoFile, { contentType: presentationVideoFile.type, upsert: false });
    if (uploadError) { setUploadingPresentation(false); notify(`${language === "es" ? "No se pudo subir el video" : "Could not upload video"}: ${uploadError.message}`); return; }
    const presentationVideoUrl = supabase.storage.from("blynk-media").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: myProfile.displayName || user.email?.split("@")[0] || "Blynk user", presentation_video_url: presentationVideoUrl }, { onConflict: "id" });
    setUploadingPresentation(false);
    if (error) { notify(`${language === "es" ? "Video subido, pero no se pudo guardar" : "Video uploaded, but could not be saved"}: ${error.message}`); return; }
    setMyProfile((profile) => ({ ...profile, presentationVideoUrl }));
    setPresentationVideo(presentationVideoUrl);
    setPresentationVideoFile(null);
    notify(language === "es" ? "Tu video de presentación ya es visible." : "Your introduction video is now visible.");
  };
  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase) return;
    if (!file.type.startsWith("image/")) { notify(language === "es" ? "Elige una imagen para tu foto de perfil." : "Choose an image for your profile photo."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para cambiar tu foto." : "Sign in to change your photo."); return; }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/profile/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("blynk-media").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { notify(`${language === "es" ? "No se pudo subir la foto" : "Could not upload photo"}: ${uploadError.message}`); return; }
    const avatarUrl = supabase.storage.from("blynk-media").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: myProfile.displayName || user.email?.split("@")[0] || "Blynk user", avatar_url: avatarUrl }, { onConflict: "id" });
    if (error) { notify(`${language === "es" ? "Foto subida, pero no se pudo guardar" : "Photo uploaded, but could not be saved"}: ${error.message}`); return; }
    setMyProfile((profile) => ({ ...profile, avatarUrl }));
    notify(language === "es" ? "Foto de perfil actualizada." : "Profile photo updated.");
  };
  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase || !file.type.startsWith("image/")) { notify(language === "es" ? "Elige una imagen para el fondo." : "Choose an image for the cover."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para cambiar el fondo." : "Sign in to change your cover."); return; }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/cover/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("blynk-media").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { notify(`${language === "es" ? "No se pudo subir el fondo" : "Could not upload cover"}: ${uploadError.message}`); return; }
    const coverUrl = supabase.storage.from("blynk-media").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: myProfile.displayName || user.email?.split("@")[0] || "Blynk user", cover_url: coverUrl }, { onConflict: "id" });
    if (error) { notify(`${language === "es" ? "Fondo subido, pero no se pudo guardar" : "Cover uploaded, but could not be saved"}: ${error.message}`); return; }
    setMyProfile((profile) => ({ ...profile, coverUrl }));
    notify(language === "es" ? "Foto de fondo actualizada." : "Cover photo updated.");
  };
  const uploadMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    if (!files.length || !supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para agregar contenido." : "Sign in to add media."); return; }
    const selected = files.slice(0, Math.max(0, 6 - media.length));
    if (!selected.length) { notify(language === "es" ? "Puedes tener hasta 6 fotos o videos." : "You can have up to 6 photos or videos."); return; }
    const uploaded: string[] = [];
    for (const file of selected) {
      const extension = file.name.split(".").pop()?.toLowerCase() || (file.type.startsWith("video/") ? "mp4" : "jpg");
      const path = `${user.id}/gallery/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("blynk-media").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) { notify(`${language === "es" ? "No se pudo subir un archivo" : "Could not upload a file"}: ${uploadError.message}`); continue; }
      const mediaUrl = supabase.storage.from("blynk-media").getPublicUrl(path).data.publicUrl;
      const { error: mediaError } = await supabase.from("profile_media").insert({ user_id: user.id, media_url: mediaUrl, media_type: file.type.startsWith("video/") ? "video" : "image" });
      if (mediaError) { notify(`${language === "es" ? "Archivo subido, pero no se pudo guardar" : "File uploaded, but could not be saved"}: ${mediaError.message}`); continue; }
      uploaded.push(mediaUrl);
    }
    if (uploaded.length) { setMedia((current) => [...current, ...uploaded]); notify(language === "es" ? "Galería actualizada." : "Gallery updated."); }
  };
  const selectPostVideo = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { setPostVideoFile(file); setPostVideo(URL.createObjectURL(file)); } };
  const selectMessageMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) { notify(language === "es" ? "Elige una foto o video." : "Choose a photo or video."); return; }
    if (file.size > 20 * 1024 * 1024) { notify(language === "es" ? "El archivo debe pesar menos de 20 MB." : "The file must be under 20 MB."); return; }
    if (file.type.startsWith("video/") && file.size > 15 * 1024 * 1024) { notify(language === "es" ? "Los videos deben pesar menos de 15 MB." : "Videos must be under 15 MB."); return; }
    setMessageMediaFile(file); setMessageMediaPreview(URL.createObjectURL(file));
  };
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!requireActiveAccount()) return;
    const content = message.trim();
    if ((!content && !messageMediaFile) || !activeMatch || !supabase || sendingMessage) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notify(language === "es" ? "Inicia sesión para enviar mensajes." : "Sign in to message."); return; }
    setSendingMessage(true);
    let mediaUrl = "";
    let mediaType: "image" | "video" | null = null;
    if (messageMediaFile) {
      const extension = messageMediaFile.name.split(".").pop()?.toLowerCase() || (messageMediaFile.type.startsWith("video/") ? "mp4" : "jpg");
      const path = `${user.id}/messages/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("blynk-media").upload(path, messageMediaFile, { contentType: messageMediaFile.type, upsert: false });
      if (uploadError) { setSendingMessage(false); notify(`${language === "es" ? "No se pudo subir el archivo" : "Could not upload the file"}: ${uploadError.message}`); return; }
      mediaUrl = supabase.storage.from("blynk-media").getPublicUrl(path).data.publicUrl;
      mediaType = messageMediaFile.type.startsWith("video/") ? "video" : "image";
    }
    const { data, error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: activeMatch.otherId, content: content || null, media_url: mediaUrl || null, media_type: mediaType }).select("id, created_at, read_at").single();
    setSendingMessage(false);
    if (error) {
      const restricted = /row-level security|policy|suspended|permission denied/i.test(error.message);
      notify(restricted ? (language === "es" ? "Esta conversación no está disponible para enviar mensajes." : "This conversation is unavailable for sending messages.") : (language === "es" ? "No se pudo enviar el mensaje. Inténtalo de nuevo." : "Your message could not be sent. Please try again."));
      return;
    }
    setChat((items) => [...items, { id: data.id, from: "me", text: content, mediaUrl: mediaUrl || undefined, mediaType: mediaType || undefined, createdAt: data.created_at, readAt: null }]);
    setMessage(""); setMessageMediaFile(null); setMessageMediaPreview("");
  };

  // Keyboard listener is intentionally installed once for the screen lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "ArrowDown") nextPerson(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  // Give Discover a full-height vertical-video stage while preserving the existing swipe action.
  useEffect(() => {
    const root = document.querySelector("main.blynk-shell");
    const feed = root?.querySelector<HTMLElement>("section.min-w-0 > div.mx-auto.max-w-md");
    if (!feed || tab !== "discover") return;
    feed.classList.add("blynk-video-feed");
    const card = feed.querySelector<HTMLElement>("article");
    if (card) {
      card.classList.remove("blynk-video-enter");
      window.requestAnimationFrame(() => card.classList.add("blynk-video-enter"));
    }
    return () => feed.classList.remove("blynk-video-feed");
  }, [tab, person?.id]);
  // The Discover safety menu keeps block and report actions close to the profile being reviewed.
  useEffect(() => {
    const root = document.querySelector("main.blynk-shell");
    const card = root?.querySelector<HTMLElement>("section.min-w-0 article[aria-label]");
    if (!card || tab !== "discover" || !person) return;
    card.querySelector("[data-blynk-profile-safety]")?.remove();
    const control = document.createElement("div");
    control.dataset.blynkProfileSafety = "true";
    control.className = "blynk-profile-safety";
    control.innerHTML = `<button type="button" class="blynk-profile-safety-trigger" aria-label="${language === "es" ? "Opciones de seguridad" : "Safety options"}">•••</button><div class="blynk-profile-safety-menu"><button type="button" data-action="report">⚑ ${language === "es" ? "Reportar perfil" : "Report profile"}</button><button type="button" data-action="block">⊘ ${language === "es" ? "Bloquear perfil" : "Block profile"}</button></div>`;
    card.appendChild(control);
    const trigger = control.querySelector<HTMLButtonElement>(".blynk-profile-safety-trigger");
    const reportButton = control.querySelector<HTMLButtonElement>('[data-action="report"]');
    const blockButton = control.querySelector<HTMLButtonElement>('[data-action="block"]');
    const stop = (event: Event) => event.stopPropagation();
    const toggle = (event: Event) => { event.stopPropagation(); control.classList.toggle("is-open"); };
    const report = (event: Event) => { event.stopPropagation(); control.classList.remove("is-open"); void reportProfile(); };
    const block = (event: Event) => { event.stopPropagation(); control.classList.remove("is-open"); void blockProfile(); };
    control.addEventListener("click", stop);
    trigger?.addEventListener("click", toggle);
    reportButton?.addEventListener("click", report);
    blockButton?.addEventListener("click", block);
    return () => { control.remove(); };
  }, [tab, person?.id, language]);
  // Conversation actions remain in the header so safety tools are always available while messaging.
  useEffect(() => {
    const history = document.querySelector<HTMLElement>(".no-scrollbar");
    const header = history?.previousElementSibling as HTMLElement | null;
    if (!header || tab !== "messages" || !activeMatch) return;
    header.querySelector("[data-blynk-conversation-tools]")?.remove();
    const tools = document.createElement("div");
    tools.dataset.blynkConversationTools = "true";
    tools.className = "blynk-conversation-tools";
    tools.innerHTML = `<button type="button" data-action="profile">${language === "es" ? "Ver perfil" : "View profile"}</button><div class="blynk-conversation-safety"><button type="button" data-action="menu" aria-label="${language === "es" ? "Opciones de seguridad" : "Safety options"}">•••</button><div class="blynk-conversation-safety-menu"><button type="button" data-action="report">⚑ ${language === "es" ? "Reportar" : "Report"}</button><button type="button" data-action="block">⊘ ${language === "es" ? "Bloquear" : "Block"}</button></div></div>`;
    header.appendChild(tools);
    const profileButton = tools.querySelector<HTMLButtonElement>('[data-action="profile"]');
    const menuButton = tools.querySelector<HTMLButtonElement>('[data-action="menu"]');
    const reportButton = tools.querySelector<HTMLButtonElement>('[data-action="report"]');
    const blockButton = tools.querySelector<HTMLButtonElement>('[data-action="block"]');
    const profile = () => void openConversationProfile();
    const menu = () => tools.classList.toggle("is-open");
    const report = () => { tools.classList.remove("is-open"); void reportConversationProfile(); };
    const block = () => { tools.classList.remove("is-open"); void blockConversationProfile(); };
    profileButton?.addEventListener("click", profile);
    menuButton?.addEventListener("click", menu);
    reportButton?.addEventListener("click", report);
    blockButton?.addEventListener("click", block);
    return () => tools.remove();
  }, [tab, activeMatch?.otherId, language]);
  // Make the visible “Next” control a real discard, even when its compact card is re-rendered.
  useEffect(() => { const onSkipClick = (event: MouseEvent) => { const button = (event.target as HTMLElement).closest("button"); if (button?.textContent?.includes(`× ${t.skip}`)) { event.preventDefault(); event.stopPropagation(); void skipProfile(); } }; document.addEventListener("click", onSkipClick, true); return () => document.removeEventListener("click", onSkipClick, true); }, [language, person?.id]);
  // The request control lives in the video card; this listener keeps that control usable for dynamic profiles.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const onRequestClick = (event: MouseEvent) => { const button = (event.target as HTMLElement).closest("button"); if (button?.textContent?.includes(t.request)) void requestMatch(); }; document.addEventListener("click", onRequestClick); return () => document.removeEventListener("click", onRequestClick); }, [language, person.id, registeredPeople.length]);
  // The profile control remains available on both compact and desktop layouts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const onLogoutClick = (event: MouseEvent) => { const button = (event.target as HTMLElement).closest("button"); if (button?.textContent?.includes(t.logOut)) void signOut(); }; document.addEventListener("click", onLogoutClick); return () => document.removeEventListener("click", onLogoutClick); }, [language]);
  // The compact profile card and the full profile use one shared editor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const onEditClick = (event: MouseEvent) => { const button = (event.target as HTMLElement).closest("button"); if (button?.textContent?.includes(t.edit)) setEditingProfile(true); }; document.addEventListener("click", onEditClick); return () => document.removeEventListener("click", onEditClick); }, [language]);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    async function loadMyProfile() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const { data } = await client.from("profiles").select("display_name, username, bio, avatar_url, cover_url, presentation_video_url, city, connection_intent, interests, onboarding_completed, suspended_at").eq("id", user.id).maybeSingle();
      if (!data?.onboarding_completed && !data?.bio) { router.replace("/onboarding"); return; }
      setMyProfile({ displayName: data?.display_name || user.user_metadata.display_name || user.email?.split("@")[0] || "Blynk user", username: data?.username || "", bio: data?.bio || "", email: user.email || "", avatarUrl: data?.avatar_url || "", coverUrl: data?.cover_url || "", presentationVideoUrl: data?.presentation_video_url || "", city: data?.city || "", connectionIntent: data?.connection_intent || "", interests: data?.interests || [] });
      setPresentationVideo(data?.presentation_video_url || "");
      setAccountSuspended(Boolean(data?.suspended_at));
      const { data: gallery } = await client.from("profile_media").select("media_url").eq("user_id", user.id).order("created_at", { ascending: true }).limit(6);
      if (gallery) setMedia(gallery.map((item) => item.media_url));
    }
    void loadMyProfile();
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    async function loadAccountNotice() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: notice }, { data: latestAppeal }] = await Promise.all([
        client.from("profiles").select("suspended_at").eq("id", user.id).maybeSingle(),
        client.from("account_notices").select("id, notice_type").eq("user_id", user.id).is("read_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        client.from("account_appeals").select("id, status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      // The review result is authoritative even if an earlier notice was dismissed or failed to arrive.
      if (profile?.suspended_at && latestAppeal?.status === "denied") {
        setAccountNotice({ id: notice?.notice_type === "appeal_denied" ? notice.id : "", notice_type: "appeal_denied" });
        return;
      }
      if (!notice) return;
      // A prior restoration notice must never override a currently suspended account.
      if (notice.notice_type === "profile_restored" && profile?.suspended_at) {
        await client.from("account_notices").update({ read_at: new Date().toISOString() }).eq("id", notice.id);
        return;
      }
      setAccountNotice(notice as AccountNotice);
    }
    void loadAccountNotice();
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    async function loadRegisteredPeople() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const { data } = await client.from("profiles").select("id, display_name, bio, avatar_url, presentation_video_url, city, birth_date, connection_intent, interests, suspended_at").neq("id", user.id).limit(50);
      if (!data?.length) return;
      const { data: skipRows } = await client.from("profile_skips").select("profile_id").eq("user_id", user.id);
      const { data: blockRows } = await client.from("blocks").select("blocked_id").eq("blocker_id", user.id);
      const skippedIds = new Set((skipRows || []).map((skip) => skip.profile_id));
      const blockedIds = new Set((blockRows || []).map((block) => block.blocked_id));
      const visibleProfiles = data.filter((profile) => !profile.suspended_at && !skippedIds.has(profile.id) && !blockedIds.has(profile.id));
      if (!visibleProfiles.length) { setRegisteredPeople([]); return; }
      const accents = ["from-orange-400 via-rose-500 to-violet-700", "from-fuchsia-600 via-purple-600 to-sky-700", "from-emerald-500 via-teal-700 to-slate-900"];
      const profileIds = visibleProfiles.map((profile) => profile.id);
      const { data: likeRows } = await client.from("profile_likes").select("profile_id, user_id").in("profile_id", profileIds);
      const likeCounts = (likeRows || []).reduce<Record<string, number>>((counts, like) => ({ ...counts, [like.profile_id]: (counts[like.profile_id] || 0) + 1 }), {});
      const myLikes = new Set((likeRows || []).filter((like) => like.user_id === user.id).map((like) => like.profile_id));
      setRegisteredPeople(visibleProfiles.map((profile, index) => ({ id: profile.id, name: profile.display_name || "Blynk user", age: profileAge(profile.birth_date), place: profile.city || (language === "es" ? "Ciudad no especificada" : "City not specified"), emoji: "✦", accent: accents[index % accents.length], intro: profile.bio || (language === "es" ? "Perfil listo para conectar." : "A profile ready to connect."), tags: profile.interests?.length ? profile.interests : [language === "es" ? "Nuevo" : "New"], intent: profile.connection_intent || "", video: profile.presentation_video_url || "", avatarUrl: profile.avatar_url || "", likeCount: likeCounts[profile.id] || 0, likedByMe: myLikes.has(profile.id) })));
    }
    void loadRegisteredPeople();
  }, [language]);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    async function loadBlockedProfiles() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const { data: blockRows } = await client.from("blocks").select("blocked_id, reason").eq("blocker_id", user.id);
      const ids = (blockRows || []).map((row) => row.blocked_id);
      if (!ids.length) { setBlockedProfiles([]); return; }
      const { data: profiles } = await client.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
      setBlockedProfiles((blockRows || []).map((row) => ({ id: row.blocked_id, name: byId.get(row.blocked_id)?.display_name || (language === "es" ? "Perfil de Blynk" : "Blynk profile"), avatarUrl: byId.get(row.blocked_id)?.avatar_url || "", reason: row.reason || "" })));
    }
    void loadBlockedProfiles();
  }, [language]);
  // Refreshes the signed-in person's incoming/outgoing match requests on load.
  useEffect(() => {
    async function refreshMatches() { await loadMatches(); }
    void refreshMatches();
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    let channel: ReturnType<typeof client.channel> | null = null;
    async function connectRealtime() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      channel = client.channel(`blynk-live-${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, async (payload) => {
          const messageRow = payload.new as { id: string; sender_id: string; content?: string | null; media_url?: string | null; media_type?: "image" | "video" | null; created_at: string };
          const { data: sender } = await client.from("profiles").select("display_name").eq("id", messageRow.sender_id).maybeSingle();
          const name = sender?.display_name || (language === "es" ? "Tu match" : "Your match");
          setIncomingAlert({ name, hasMedia: Boolean(messageRow.media_type) });
          window.setTimeout(() => setIncomingAlert(null), 6000);
          if (activeMatch?.otherId === messageRow.sender_id) {
            setChat((items) => [...items, { id: messageRow.id, from: name, text: messageRow.content || "", mediaUrl: messageRow.media_url || undefined, mediaType: messageRow.media_type || undefined, createdAt: messageRow.created_at }]);
            await client.from("messages").update({ read_at: new Date().toISOString() }).eq("id", messageRow.id);
          }
          void loadMatches();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` }, (payload) => {
          const messageRow = payload.new as { id: string; read_at?: string | null };
          if (messageRow.read_at) setChat((items) => items.map((item) => item.id === messageRow.id ? { ...item, readAt: messageRow.read_at } : item));
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_requests", filter: `recipient_id=eq.${user.id}` }, () => {
          notify(language === "es" ? "Tienes una nueva solicitud de match." : "You have a new match request.");
          void loadMatches();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_requests", filter: `recipient_id=eq.${user.id}` }, () => { void loadMatches(); })
        .subscribe();
    }
    void connectRealtime();
    return () => { if (channel) void client.removeChannel(channel); };
  }, [language, activeMatch?.otherId]);
  useEffect(() => {
    const sentMessages = chat.filter((item) => item.from === "me");
    const bubbles = Array.from(document.querySelectorAll<HTMLDivElement>("div.pink-gradient.ml-auto"));
    bubbles.forEach((bubble, index) => {
      const message = sentMessages[index];
      const previous = bubble.querySelector("[data-blynk-receipt]");
      if (!message) { previous?.remove(); return; }
      const receipt = (previous as HTMLSpanElement | null) || document.createElement("span");
      receipt.dataset.blynkReceipt = "true";
      receipt.className = `blynk-message-receipt ${message.readAt ? "is-read" : "is-delivered"}`;
      receipt.textContent = message.readAt ? "● ●" : "●";
      receipt.setAttribute("aria-label", message.readAt ? (language === "es" ? "Leído" : "Read") : (language === "es" ? "Entregado" : "Delivered"));
      const time = bubble.querySelector("time");
      if (time) time.style.display = "inline";
      if (!previous) time?.after(receipt);
    });
  }, [chat, language, tab]);
  useEffect(() => {
    if (tab !== "messages" || !activeMatch) return;
    const history = document.querySelector<HTMLElement>(".no-scrollbar");
    if (history) history.scrollTo({ top: history.scrollHeight, behavior: "smooth" });
  }, [chat, tab, activeMatch]);
  useEffect(() => {
    const client = supabase;
    const match = activeMatch;
    if (!client || !match) return;
    const supabaseClient = client;
    const activeConversation = match;
    let cancelled = false;
    async function refreshReadReceipts() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabaseClient.from("messages").select("id, read_at").eq("sender_id", user.id).eq("receiver_id", activeConversation.otherId).not("read_at", "is", null);
      if (!data || cancelled) return;
      const readById = new Map(data.map((item) => [item.id, item.read_at]));
      setChat((items) => items.map((item) => readById.has(item.id) ? { ...item, readAt: readById.get(item.id) || item.readAt } : item));
    }
    void refreshReadReceipts();
    const interval = window.setInterval(() => void refreshReadReceipts(), 4000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [activeMatch]);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    async function loadCommunity() {
      const { data, error } = await client.from("posts").select("id, user_id, caption, video_url, comments_enabled, created_at, profiles(display_name)").order("created_at", { ascending: false }).limit(30);
      if (error || !data?.length) return;
      const storedPosts = data as unknown as StoredPost[];
      const postIds = storedPosts.map((post) => post.id);
      const [{ data: likes }, { data: comments }] = await Promise.all([
        client.from("likes").select("post_id").in("post_id", postIds),
        client.from("comments").select("id, post_id, user_id, content, created_at, parent_id, hidden_at, profiles(display_name)").in("post_id", postIds).order("created_at", { ascending: true }),
      ]);
      const likesByPost = (likes as unknown as StoredLike[] | null)?.reduce<Record<string, number>>((total, like) => ({ ...total, [like.post_id]: (total[like.post_id] || 0) + 1 }), {}) || {};
      const commentsByPost = (comments as unknown as StoredComment[] | null)?.reduce<Record<string, CommunityComment[]>>((total, entry) => ({ ...total, [entry.post_id]: [...(total[entry.post_id] || []), { id: entry.id, content: entry.content, author: entry.profiles?.[0]?.display_name || "Blynk user", authorId: entry.user_id, createdAt: entry.created_at, parentId: entry.parent_id, hidden: Boolean(entry.hidden_at) }] }), {}) || {};
      setPosts(storedPosts.map((post) => { const displayName = post.profiles?.[0]?.display_name || "Blynk user"; return { id: post.id, author: displayName, authorId: post.user_id, initial: displayName.slice(0, 1).toUpperCase(), time: new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", { dateStyle: "medium" }).format(new Date(post.created_at)), text: post.caption || "", video: post.video_url || undefined, likes: likesByPost[post.id] || 0, commentsEnabled: post.comments_enabled !== false, comments: (commentsByPost[post.id] || []).filter((entry) => !entry.hidden) }; }));
    }
    void loadCommunity();
  }, [language]);

  // A few legacy interface labels were written directly into the early prototype.
  // Keep them aligned with the selected language until they are moved into the copy map.
  useEffect(() => {
    const root = document.querySelector("main.blynk-shell");
    if (!root) return;
    const labels = language === "es"
      ? new Map<string, string>()
      : new Map<string, string>([
          ["Tu perfil está al 78%", "Your profile is 78% complete"],
          ["Agrega un video de presentación y recibe más conexiones relevantes.", "Add an introduction video to receive more relevant connections."],
          ["▶ Video de presentación", "▶ Introduction video"],
          ["Tu perfil", "Your profile"],
          ["Video de presentación", "Introduction video"],
          ["Este video se mostrará a las personas antes de que decidan enviarte una solicitud.", "This video is shown before people decide whether to send you a match request."],
          ["▣ Elegir video", "▣ Choose video"],
          ["Subiendo…", "Uploading…"],
          ["Publicar como video de presentación", "Publish as introduction video"],
          ["▧ Foto de fondo", "▧ Cover photo"],
          ["Cambiar", "Change"],
          ["Cargando…", "Loading…"],
          ["sin_usuario", "no_username"],
          ["Nueva solicitud · Ver perfil", "New request · View profile"],
          ["Solicitud de match", "Match request"],
          ["Revisa su video y perfil antes de decidir.", "Review their video and profile before deciding."],
          ["Esta persona aún no ha añadido una biografía.", "This person has not added a bio yet."],
          ["Perfil verificado", "Verified profile"],
          ["× Rechazar", "× Decline"],
          ["♥ Aceptar match", "♥ Accept match"],
        ]);
    if (labels.size) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      nodes.forEach((node) => {
        const replacement = labels.get(node.textContent || "");
        if (replacement) node.textContent = replacement;
      });
    }
    const selector = root.querySelector<HTMLSelectElement>('select[aria-label="Idioma"], select[aria-label="Language"]');
    let removeLanguageListeners: (() => void) | undefined;
    if (selector) {
      selector.setAttribute("aria-label", language === "es" ? "Idioma" : "Language");
      if (selector.options[0]) selector.options[0].text = "Español";
      if (selector.options[1]) selector.options[1].text = "English";
      selector.classList.add("blynk-language-native");
    }
    root.querySelector("[data-blynk-language-switcher]")?.remove();
    root.querySelector("[data-blynk-profile-language-menu]")?.remove();
    if (tab === "profile") {
      const menu = document.createElement("details");
      menu.dataset.blynkProfileLanguageMenu = "true";
      menu.className = "blynk-profile-language-menu";
      menu.innerHTML = `<summary><span aria-hidden="true">◎</span><span>${language === "es" ? "Español" : "English"}</span><span aria-hidden="true" class="blynk-language-chevron">⌄</span></summary><div class="blynk-profile-language-options"><button type="button" aria-pressed="${language === "en"}">English</button><button type="button" aria-pressed="${language === "es"}">Español</button></div>`;
      const accountCard = Array.from(root.querySelectorAll<HTMLElement>("article")).find((article) => article.textContent?.includes(language === "es" ? "Privacidad y cuenta" : "Privacy and account"));
      if (accountCard) accountCard.after(menu); else root.appendChild(menu);
      const [englishButton, spanishButton] = Array.from(menu.querySelectorAll<HTMLButtonElement>("button"));
      const chooseEnglish = () => { setLanguage("en"); menu.removeAttribute("open"); };
      const chooseSpanish = () => { setLanguage("es"); menu.removeAttribute("open"); };
      englishButton?.addEventListener("click", chooseEnglish);
      spanishButton?.addEventListener("click", chooseSpanish);
      removeLanguageListeners = () => {
        englishButton?.removeEventListener("click", chooseEnglish);
        spanishButton?.removeEventListener("click", chooseSpanish);
      };
    }
    const accountLink = root.querySelector<HTMLAnchorElement>('a[href="/login"]');
    if (!accountLink) return removeLanguageListeners;
    if (!myProfile.email) {
      accountLink.textContent = language === "es" ? "Ingresar" : "Sign in";
      return removeLanguageListeners;
    }
    accountLink.textContent = language === "es" ? "Cerrar sesión" : "Sign out";
    accountLink.setAttribute("aria-label", language === "es" ? "Cerrar sesión" : "Sign out");
    const onSignOut = (event: MouseEvent) => { event.preventDefault(); void signOut(); };
    accountLink.addEventListener("click", onSignOut);
    return () => { removeLanguageListeners?.(); accountLink.removeEventListener("click", onSignOut); };
  }, [language, myProfile.email, presentationOpen, tab, editingProfile, reviewingRequest, viewingProfile, previewingOwnProfile]);

  useEffect(() => {
    if (!blockedListOpen) return;
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4 backdrop-blur-sm";
    const panel = document.createElement("section");
    panel.className = "blynk-card max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-[2rem] p-6";
    const title = document.createElement("h2"); title.className = "text-2xl font-black"; title.textContent = language === "es" ? "Personas bloqueadas" : "Blocked people";
    const description = document.createElement("p"); description.className = "mt-2 text-sm leading-6 text-white/55"; description.textContent = language === "es" ? "Puedes desbloquear a una persona cuando decidas volver a permitirle encontrarte y enviarte mensajes." : "You can unblock someone when you decide to allow them to find and message you again.";
    const list = document.createElement("div"); list.className = "mt-5 space-y-3";
    if (!blockedProfiles.length) { const empty = document.createElement("p"); empty.className = "rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50"; empty.textContent = language === "es" ? "No has bloqueado a ninguna persona." : "You have not blocked anyone."; list.appendChild(empty); }
    blockedProfiles.forEach((profile) => { const item = document.createElement("div"); item.className = "flex items-center gap-3 rounded-2xl bg-white/5 p-3"; const avatar = document.createElement("span"); avatar.className = "grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-pink-400 to-violet-600 font-bold"; if (profile.avatarUrl) { const image = document.createElement("img"); image.src = profile.avatarUrl; image.alt = ""; image.className = "size-full object-cover"; avatar.appendChild(image); } else avatar.textContent = profile.name.slice(0, 1).toUpperCase(); const details = document.createElement("span"); details.className = "min-w-0 flex-1"; const name = document.createElement("b"); name.className = "block truncate text-sm"; name.textContent = profile.name; details.appendChild(name); const button = document.createElement("button"); button.className = "rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-pink-200"; button.textContent = language === "es" ? "Desbloquear" : "Unblock"; button.addEventListener("click", () => void unblockProfile(profile.id)); item.append(avatar, details, button); list.appendChild(item); });
    const close = document.createElement("button"); close.className = "soft-button mt-5 w-full rounded-xl border border-white/15 bg-white/5 py-3 font-bold"; close.textContent = language === "es" ? "Cerrar" : "Close"; close.addEventListener("click", () => setBlockedListOpen(false));
    panel.append(title, description, list, close); overlay.appendChild(panel); document.body.appendChild(overlay);
    return () => overlay.remove();
  }, [blockedListOpen, blockedProfiles, language]);

  useEffect(() => {
    if (!accountNotice || accountNotice.notice_type !== "profile_suspended") return;
    const frame = window.requestAnimationFrame(() => {
      const dialog = Array.from(document.querySelectorAll<HTMLElement>('section[role="dialog"]')).find((element) => element.textContent?.includes(language === "es" ? "Tu perfil fue suspendido" : "Your profile was suspended"));
      if (!dialog || dialog.querySelector("[data-blynk-appeal-button]")) return;
      const button = document.createElement("button"); button.dataset.blynkAppealButton = "true"; button.className = "mt-3 w-full text-sm font-bold text-pink-200"; button.textContent = language === "es" ? "Solicitar revisión" : "Request a review"; button.addEventListener("click", () => setAppealOpen(true)); dialog.appendChild(button);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [accountNotice, language]);

  useEffect(() => {
    if (!accountNotice || accountNotice.notice_type !== "appeal_denied") return;
    const frame = window.requestAnimationFrame(() => {
      const dialog = Array.from(document.querySelectorAll<HTMLElement>('section[role="dialog"]')).find((element) => element.textContent?.includes(language === "es" ? "Tu perfil fue restaurado" : "Your profile was restored"));
      if (!dialog) return;
      dialog.querySelector("span")!.textContent = "⚠";
      dialog.querySelector("h2")!.textContent = language === "es" ? "Solicitud no aprobada" : "Review request not approved";
      const description = dialog.querySelectorAll("p")[1];
      if (description) description.textContent = language === "es" ? "Tu solicitud fue revisada y tu perfil permanece suspendido. No aparecerá en Descubrir ni podrás iniciar nuevas conversaciones." : "Your request was reviewed and your profile remains suspended. It will not appear in Discover and you cannot start new conversations.";
    });
    return () => window.cancelAnimationFrame(frame);
  }, [accountNotice, language]);

  useEffect(() => {
    if (!appealOpen) return;
    const overlay = document.createElement("div"); overlay.className = "fixed inset-0 z-[95] grid place-items-center bg-black/80 p-4 backdrop-blur-sm";
    const panel = document.createElement("section"); panel.className = "blynk-card w-full max-w-md rounded-[2rem] p-6";
    panel.innerHTML = `<p class="text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Safety</p><h2 class="mt-2 text-2xl font-black">${language === "es" ? "Solicitar revisión" : "Request a review"}</h2><p class="mt-2 text-sm leading-6 text-white/60">${language === "es" ? "Explícanos por qué consideras que la suspensión debe revisarse. Un administrador evaluará tu solicitud." : "Tell us why you believe the suspension should be reviewed. An administrator will review your request."}</p><textarea data-appeal-reason class="mt-5 min-h-32 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-white outline-none" maxlength="1000" placeholder="${language === "es" ? "Escribe al menos 20 caracteres…" : "Write at least 20 characters…"}"></textarea><button data-submit-appeal disabled class="pink-gradient soft-button mt-4 w-full rounded-xl py-3.5 font-bold disabled:opacity-50">${language === "es" ? "Enviar solicitud" : "Send request"}</button><button data-close-appeal class="mt-3 w-full text-sm font-bold text-white/55">${language === "es" ? "Cancelar" : "Cancel"}</button>`;
    const textarea = panel.querySelector<HTMLTextAreaElement>("[data-appeal-reason]"); const submit = panel.querySelector<HTMLButtonElement>("[data-submit-appeal]"); const close = panel.querySelector<HTMLButtonElement>("[data-close-appeal]");
    const update = () => { if (submit && textarea) submit.disabled = textarea.value.trim().length < 20; };
    textarea?.addEventListener("input", update); submit?.addEventListener("click", () => { if (textarea) void submitAppeal(textarea.value); }); close?.addEventListener("click", () => setAppealOpen(false));
    overlay.appendChild(panel); document.body.appendChild(overlay); return () => overlay.remove();
  }, [appealOpen, language]);

  if (accountSuspended) {
    const appealDenied = accountNotice?.notice_type === "appeal_denied";
    return <main className="blynk-shell grid min-h-screen place-items-center p-5 text-white"><section className="blynk-card w-full max-w-md rounded-[2rem] p-7 text-center"><span className="mx-auto grid size-16 place-items-center rounded-3xl bg-rose-400/15 text-3xl text-rose-200">⚠</span><p className="mt-5 text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Safety</p><h1 className="mt-2 text-2xl font-black">{appealDenied ? (language === "es" ? "Solicitud no aprobada" : "Review request not approved") : (language === "es" ? "Tu cuenta está suspendida" : "Your account is suspended")}</h1><p className="mt-4 text-sm leading-6 text-white/65">{appealDenied ? (language === "es" ? "Tu solicitud fue revisada y no fue aprobada. Tu cuenta sigue suspendida y no puede aparecer en Descubrir, enviar mensajes ni solicitar matches." : "Your request was reviewed and was not approved. Your account remains suspended and cannot appear in Discover, send messages, or request matches.") : (language === "es" ? "Tu cuenta está temporalmente restringida mientras Blynk revisa los reportes. No tendrás acceso al perfil ni a las funciones sociales durante esta revisión." : "Your account is temporarily restricted while Blynk reviews reports. You will not have access to your profile or social features during this review.")}</p>{!appealDenied && <button onClick={() => setAppealOpen(true)} className="mt-6 w-full rounded-xl border border-pink-300/30 bg-pink-400/10 py-3 font-bold text-pink-100">{language === "es" ? "Solicitar revisión" : "Request a review"}</button>}<button onClick={() => void signOut()} className="pink-gradient soft-button mt-3 w-full rounded-xl py-3.5 font-bold">{language === "es" ? "Cerrar sesión" : "Sign out"}</button></section></main>;
  }

  return <main className="blynk-shell min-h-screen">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090914e8] backdrop-blur-xl"><div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6"><button onClick={() => setTab("discover")} className="flex items-center gap-2 text-xl font-black tracking-tight"><span aria-hidden="true" className="drop-shadow-[0_0_8px_#f13ab5]"><svg viewBox="0 0 96 58" className="h-7 w-9"><defs><linearGradient id="blynk-mini-eye" x1="0" x2="1"><stop stopColor="#ff4fac"/><stop offset="1" stopColor="#a855f7"/></linearGradient></defs><path d="M3 29C16 11 31 3 48 3s32 8 45 26C80 47 65 55 48 55S16 47 3 29Z" fill="url(#blynk-mini-eye)"/><path d="M13 29C24 18 35 13 48 13s24 5 35 16C72 40 61 45 48 45S24 40 13 29Z" fill="#fff4fb"/><circle cx="48" cy="29" r="11" fill="#18bfc9"/><circle cx="48" cy="29" r="6" fill="#07101e"/><circle cx="44" cy="25" r="2.5" fill="white"/></svg></span><span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">Blynk</span></button><span aria-label="Ojo Blynk" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_14px_#f13ab5]"><svg viewBox="0 0 96 58" className="h-10 w-16 sm:h-12 sm:w-20" role="img"><defs><linearGradient id="blynk-eye" x1="0" x2="1"><stop stopColor="#ff4fac"/><stop offset="1" stopColor="#a855f7"/></linearGradient><radialGradient id="blynk-iris"><stop stopColor="#d8ffff"/><stop offset=".42" stopColor="#46e4e2"/><stop offset=".72" stopColor="#117f9c"/><stop offset="1" stopColor="#071726"/></radialGradient></defs><path d="M3 29C16 11 31 3 48 3s32 8 45 26C80 47 65 55 48 55S16 47 3 29Z" fill="url(#blynk-eye)"/><path d="M10 29C21 16 34 10 48 10s27 6 38 19C75 42 62 48 48 48S21 42 10 29Z" fill="#fff4fb"/><circle cx="48" cy="29" r="16" fill="url(#blynk-iris)"/><circle cx="48" cy="29" r="8" fill="#07101e"/><circle cx="42" cy="23" r="4" fill="white"/><circle cx="54" cy="35" r="2" fill="#baffff"/></svg></span><div className="flex items-center gap-2"><select aria-label="Idioma" value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"><option value="es">ES</option><option value="en">EN</option></select><a href="/login" className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white sm:block">{language === "es" ? "Ingresar" : "Sign in"}</a></div></div></header>
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-24 pt-6 md:px-6 lg:grid-cols-[185px_minmax(0,1fr)_260px]">
      <aside className="hidden lg:block"><nav className="blynk-card sticky top-24 space-y-1 rounded-3xl p-2">{([ ["discover", "▷"], ["community", "◎"], ["messages", "✉"], ["profile", "◌"] ] as [Tab, string][]).map(([key, icon]) => <button key={key} onClick={() => setTab(key)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold ${tab === key ? "bg-white/10 text-pink-300" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><span>{icon}</span>{t[key]}</button>)}</nav></aside>
      <section className="min-w-0">
        {tab === "discover" && <div className="mx-auto max-w-md" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="mb-3 grid grid-cols-2 rounded-2xl bg-white/5 p-1 text-center text-sm font-bold"><button onClick={() => { setDiscoverMode("forYou"); setPersonIndex(0); }} className={`rounded-xl py-3 ${discoverMode === "forYou" ? "bg-white/10 text-pink-300" : "text-white/45"}`}>{t.forYou}</button><button onClick={() => { setDiscoverMode("nearby"); setPersonIndex(0); }} className={`rounded-xl py-3 ${discoverMode === "nearby" ? "bg-white/10 text-pink-300" : "text-white/45"}`}>{t.nearby}</button></div>
          <button onClick={() => setFiltersOpen((value) => !value)} className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold"><span>⌘ {language === "es" ? "Filtros" : "Filters"}</span><span className="text-pink-200">{filtersOpen ? "−" : "+"}</span></button>
          {filtersOpen && <div className="mb-4 space-y-3 rounded-2xl border border-white/10 bg-[#171526] p-4 text-sm"><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-white/65">{language === "es" ? "Edad mínima" : "Minimum age"}<input value={ageRange.min} type="number" min="18" max="80" onChange={(event) => { const min = Math.min(Number(event.target.value) || 18, ageRange.max); setAgeRange({ ...ageRange, min }); setPersonIndex(0); }} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none" /></label><label className="text-xs font-bold text-white/65">{language === "es" ? "Edad máxima" : "Maximum age"}<input value={ageRange.max} type="number" min={ageRange.min} max="80" onChange={(event) => { const max = Math.max(Number(event.target.value) || 60, ageRange.min); setAgeRange({ ...ageRange, max }); setPersonIndex(0); }} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none" /></label></div>{discoverMode === "forYou" && <label className="block text-xs font-bold text-white/65">{language === "es" ? "Ciudad" : "City"}<input value={cityFilter} onChange={(event) => { setCityFilter(event.target.value); setPersonIndex(0); }} placeholder={language === "es" ? "Todas las ciudades" : "All cities"} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none" /></label>}<div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-white/65">{language === "es" ? "Interés" : "Interest"}<select value={interestFilter} onChange={(event) => { setInterestFilter(event.target.value); setPersonIndex(0); }} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"><option value="">{language === "es" ? "Todos" : "All"}</option>{availableInterests.map((interest) => <option value={interest} key={interest}>{interest}</option>)}</select></label><label className="text-xs font-bold text-white/65">{language === "es" ? "Intención" : "Intent"}<select value={intentFilter} onChange={(event) => { setIntentFilter(event.target.value); setPersonIndex(0); }} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"><option value="">{language === "es" ? "Todas" : "All"}</option><option value="Intentional dating">{language === "es" ? "Citas intencionales" : "Intentional dating"}</option><option value="New friendships">{language === "es" ? "Nuevas amistades" : "New friendships"}</option><option value="Open to meeting people">{language === "es" ? "Conocer personas" : "Open to meeting people"}</option></select></label></div><button onClick={() => { setAgeRange({ min: 18, max: 60 }); setCityFilter(""); setInterestFilter(""); setIntentFilter(""); setPersonIndex(0); }} className="text-xs font-bold text-pink-200">{language === "es" ? "Restablecer filtros" : "Reset filters"}</button></div>}
          {discoverMode === "nearby" && !myProfile.city && <p className="mb-3 rounded-2xl border border-pink-300/20 bg-pink-400/10 p-3 text-center text-xs text-pink-100">{language === "es" ? "Añade tu ciudad en Perfil para usar Cerca." : "Add your city in Profile to use Nearby."}</p>}
          {!person ? <div className="blynk-card grid aspect-[9/14] place-items-center rounded-[2rem] p-8 text-center"><div><span className="text-4xl">⌕</span><h2 className="mt-4 text-xl font-black">{language === "es" ? "No hay perfiles con estos filtros" : "No profiles match these filters"}</h2><p className="mt-2 text-sm leading-6 text-white/55">{language === "es" ? "Prueba ampliando tu edad, ciudad, intereses o intención." : "Try expanding your age, city, interests or intent."}</p></div></div> : <><article onClick={() => void openPublicProfile(person)} className="blynk-card relative aspect-[9/14] cursor-pointer overflow-hidden rounded-[2rem]" aria-label={`${person.name}, ${person.age}`}>{person.video ? <video key={person.id} className="absolute inset-0 size-full object-cover" src={person.video} autoPlay muted loop playsInline /> : person.avatarUrl ? <img src={person.avatarUrl} alt={`Photo of ${person.name}`} className="absolute inset-0 size-full object-cover" /> : <div className={`absolute inset-0 grid place-items-center bg-gradient-to-br text-7xl ${person.accent}`}>{person.emoji}</div>}<div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#080812]/90 via-[#080812]/35 to-transparent" /><button onClick={(event) => void toggleProfileLike(event)} className={`soft-button absolute right-4 top-4 flex min-w-14 items-center justify-center gap-1 rounded-full border px-3 py-2 text-sm font-bold backdrop-blur ${person.likedByMe ? "border-pink-300 bg-pink-500/35 text-pink-100" : "border-white/15 bg-black/35 text-white"}`} aria-label={language === "es" ? "Me gusta" : "Like"}>{person.likedByMe ? "♥" : "♡"}<span>{person.likeCount || 0}</span></button><div className="absolute inset-x-0 bottom-0 p-6"><span className="mb-3 inline-flex rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-100">● ONLINE</span><h1 className="text-3xl font-black">{person.name}, {person.age}</h1><p className="mt-2 text-sm leading-6 text-white/85">{person.intro}</p><div className="mt-4 flex flex-wrap gap-2">{person.tags.map((tag) => <span key={tag} className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold">{tag}</span>)}</div></div></article><p className="animate-pulse py-3 text-center text-xs text-white/45">↑ {t.swipe}</p><div className="grid grid-cols-[1fr_1.45fr] gap-3"><button onClick={nextPerson} className="soft-button rounded-2xl border border-white/15 bg-white/5 py-4 font-bold text-white/80">× {t.skip}</button><button onClick={() => { void requestMatch(); nextPerson(); }} className="soft-button pink-gradient rounded-2xl py-4 font-bold shadow-[0_12px_28px_#ef38b755]">♥ {t.request}</button></div></>}</div>}
        {tab === "community" && <div className="mx-auto max-w-xl space-y-4">
          <div><p className="text-sm font-semibold text-pink-300">Blynk Community</p><h1 className="mt-1 text-2xl font-black">{t.share}</h1></div>
          <div className="blynk-card rounded-3xl p-4">
            <textarea value={postText} onChange={(event) => setPostText(event.target.value)} placeholder={t.thought} className="min-h-24 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
            {postVideo && <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10"><video src={postVideo} className="max-h-72 w-full bg-black object-contain" controls muted playsInline /><button onClick={() => { setPostVideo(""); setPostVideoFile(null); }} className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold">× Quitar</button></div>}
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><label className="cursor-pointer text-sm font-bold text-white/60">▣ {t.addVideo}<input onChange={selectPostVideo} className="hidden" type="file" accept="video/*" /></label><button disabled={uploadingPost} onClick={addPost} className="soft-button pink-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-wait disabled:opacity-60">{uploadingPost ? (language === "es" ? "Subiendo…" : "Uploading…") : t.publish}</button></div>
          </div>
          {posts.map((post) => <article key={post.id} className="blynk-card rounded-3xl p-5">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-violet-600 font-black">{post.initial}</span><div><p className="font-bold">{post.author}</p><p className="text-xs text-white/45">{post.time} · {t.public}</p></div><button onClick={() => setMenu(menu === post.id ? null : post.id)} className="ml-auto rounded-full p-2 text-white/50 hover:bg-white/10">•••</button></div>
            {menu === post.id && <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 text-xs shadow-xl"><button onClick={() => void updateCommentsEnabled(post)} className="rounded-xl bg-white/5 px-3 py-2 text-left hover:bg-white/10">{post.commentsEnabled ? t.disableComments : (language === "es" ? "Activar comentarios" : "Enable comments")}</button><button onClick={() => { notify(language === "es" ? "Selecciona un comentario para reportarlo." : "Select a comment to report it."); setMenu(null); }} className="rounded-xl bg-white/5 px-3 py-2 text-left hover:bg-white/10">{t.report}</button><button onClick={() => { notify(language === "es" ? "Selecciona un comentario para bloquear a esa persona." : "Select a comment to block that person."); setMenu(null); }} className="rounded-xl bg-white/5 px-3 py-2 text-left hover:bg-white/10">{t.block}</button>{post.authorId && <button onClick={() => setPosts((items) => items.filter((item) => item.id !== post.id))} className="rounded-xl bg-rose-400/10 px-3 py-2 text-left text-rose-200 hover:bg-rose-400/20">{t.delete}</button>}</div>}
            {post.text && <p className="mt-4 leading-6 text-white/90">{post.text}</p>}{post.video && <video src={post.video} className="mt-4 w-full rounded-2xl bg-black" controls autoPlay muted loop playsInline />}
            <div className="mt-4 flex gap-5 border-t border-white/10 pt-3 text-sm text-white/55"><button onClick={() => addLike(post.id)}>♡ {post.likes}</button><span>◌ {post.comments.length} {t.comments.toLowerCase()}</span></div>
            {post.commentsEnabled && <div className="mt-3 space-y-2">{post.comments.map((entry) => <div className="rounded-2xl bg-white/5 p-3 text-sm text-white/75" key={entry.id}><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="font-bold text-white/90">{entry.author}{entry.parentId && <span className="ml-2 text-xs font-normal text-pink-200">↳ {language === "es" ? "respuesta" : "reply"}</span>}</p><p className="mt-1 break-words">{entry.content}</p></div><button onClick={() => setCommentMenu(commentMenu === entry.id ? null : entry.id)} aria-label={language === "es" ? "Opciones del comentario" : "Comment options"} className="rounded-lg px-2 py-1 text-white/50 hover:bg-white/10">•••</button></div>{commentMenu === entry.id && <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs"><button onClick={() => void runCommentAction(post, entry, "reply")} className="rounded-lg bg-white/5 px-2 py-2 text-left hover:bg-white/10">↩ {t.reply}</button><button onClick={() => void runCommentAction(post, entry, "copy")} className="rounded-lg bg-white/5 px-2 py-2 text-left hover:bg-white/10">⧉ {t.copy}</button><button onClick={() => void runCommentAction(post, entry, "hide")} className="rounded-lg bg-white/5 px-2 py-2 text-left hover:bg-white/10">◉ {t.hide}</button><button onClick={() => void runCommentAction(post, entry, "report")} className="rounded-lg bg-white/5 px-2 py-2 text-left hover:bg-white/10">⚑ {t.report}</button><button onClick={() => void runCommentAction(post, entry, "block")} className="rounded-lg bg-white/5 px-2 py-2 text-left hover:bg-white/10">⊘ {t.block}</button><button onClick={() => void runCommentAction(post, entry, "delete")} className="rounded-lg bg-rose-400/10 px-2 py-2 text-left text-rose-200 hover:bg-rose-400/20">× {t.delete}</button></div>}</div>)}<div className="rounded-2xl border border-white/10 bg-black/15 p-2"><div className="flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2 text-sm outline-none" placeholder={replyTo?.postId === post.id ? `${t.reply} ${replyTo.author}…` : t.comment} /><button onClick={() => void addComment(post.id)} className="rounded-xl bg-white/10 px-3 text-sm font-bold hover:bg-white/15">{t.send}</button></div>{replyTo?.postId === post.id && <button onClick={() => { setReplyTo(null); setComment(""); }} className="px-3 py-1 text-xs text-pink-200">× {language === "es" ? `Responder a ${replyTo.author}` : `Replying to ${replyTo.author}`}</button>}</div></div>}
          </article>)}
        </div>}
        {tab === "messages" && (activeMatch && hasReceivedMessage ? <div className="mx-auto flex h-[68dvh] max-w-xl flex-col overflow-hidden rounded-3xl blynk-card"><div className="flex items-center gap-3 border-b border-white/10 p-4"><span className="grid size-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-pink-500 font-bold">{activeMatch.otherAvatarUrl ? <img src={activeMatch.otherAvatarUrl} alt="" className="size-full object-cover" /> : conversationName.slice(0, 1).toUpperCase()}</span><div><p className="font-bold">{conversationName}</p><p className="text-xs text-emerald-300">● {language === "es" ? "match confirmado" : "confirmed match"}</p></div><button onClick={() => setActiveMatch(null)} className="ml-auto text-xs text-white/55">{language === "es" ? "Cerrar" : "Close"}</button></div><div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">{chat.map((item, index) => <div key={index} className={`max-w-[78%] overflow-hidden rounded-2xl text-sm ${item.from === "me" ? "pink-gradient ml-auto" : "bg-white/10"}`}>{item.mediaUrl && (item.mediaType === "video" ? <video src={item.mediaUrl} className="max-h-72 w-full bg-black object-contain" controls playsInline /> : <img src={item.mediaUrl} alt={language === "es" ? "Foto compartida" : "Shared photo"} className="max-h-80 w-full object-cover" />)}<div className="px-4 py-3">{item.text && <p>{item.text}</p>}<time className="mt-1 block text-[10px] opacity-65">{messageTime(item.createdAt)}</time></div></div>)}</div><form onSubmit={sendMessage} className="border-t border-white/10 p-3">{messageMediaPreview && <div className="relative mb-2 overflow-hidden rounded-2xl border border-white/10 bg-black/30">{messageMediaFile?.type.startsWith("video/") ? <video src={messageMediaPreview} className="max-h-40 w-full object-contain" muted playsInline /> : <img src={messageMediaPreview} alt="" className="max-h-40 w-full object-contain" />}<button type="button" onClick={() => { setMessageMediaFile(null); setMessageMediaPreview(""); }} className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold">×</button></div>}<div className="flex gap-2"><label className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 text-lg hover:bg-white/15" title={language === "es" ? "Enviar foto o video" : "Send photo or video"}>＋<input onChange={selectMessageMedia} className="hidden" type="file" accept="image/*,video/*" /></label><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={language === "es" ? `Mensaje para ${conversationName}…` : `Message ${conversationName}…`} className="min-w-0 flex-1 rounded-full bg-white/5 px-4 py-3 text-sm outline-none" /><button disabled={sendingMessage} className="pink-gradient rounded-full px-5 font-bold disabled:opacity-60">{sendingMessage ? "…" : "➤"}</button></div><p className="mt-2 text-center text-[10px] text-white/40">{language === "es" ? "Fotos hasta 20 MB · videos hasta 15 MB" : "Photos up to 20 MB · videos up to 15 MB"}</p></form></div> : inboxMatchIds.length ? <div className="mx-auto max-w-xl space-y-3 py-8"><div className="flex items-center justify-between px-1"><h2 className="text-xl font-black">{language === "es" ? "Mensajes" : "Messages"}</h2><span className="rounded-full bg-pink-400/15 px-3 py-1 text-xs font-bold text-pink-200">{inboxMatchIds.length} {language === "es" ? "nuevos" : "new"}</span></div>{matchRequests.filter((request) => inboxMatchIds.includes(request.otherId)).map((request) => { const preview = inboxPreviews[request.otherId]; return <button key={request.id} onClick={() => void openConversation(request)} className="blynk-card flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:border-pink-300/40"><span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-pink-500 font-bold">{request.otherAvatarUrl ? <img src={request.otherAvatarUrl} alt="" className="size-full object-cover" /> : request.otherName.slice(0, 1).toUpperCase()}{preview?.unread && <i className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-[#151525] bg-pink-400" />}</span><span className="min-w-0 flex-1"><b className="block truncate">{request.otherName}</b><small className={`block truncate ${preview?.unread ? "font-bold text-white/85" : "text-white/50"}`}>{preview?.content || (language === "es" ? "Te envió un mensaje" : "Sent you a message")}</small></span><time className="self-start text-[11px] text-white/45">{preview ? messageTime(preview.createdAt) : ""}</time></button>; })}</div> : <div className="mx-auto max-w-xl py-20 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-pink-400/10 text-2xl text-pink-200">✉</span><h2 className="mt-5 text-xl font-black">{language === "es" ? "Aún no tienes mensajes" : "No messages yet"}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/55">{language === "es" ? "Las conversaciones aparecerán aquí cuando uno de tus matches te escriba primero." : "Conversations will appear here when one of your matches messages you first."}</p></div>)}
        {tab === "profile" && <div className="mx-auto max-w-xl space-y-4"><section className="blynk-card overflow-hidden rounded-3xl"><div className="h-28 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-violet-700" /><div className="px-5 pb-5"><div className="-mt-12 flex items-end justify-between"><span className="grid size-24 place-items-center rounded-3xl border-4 border-[#151525] bg-gradient-to-br from-amber-300 to-rose-500 text-3xl font-black">L</span><button onClick={() => notify(t.edit)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">✎ {t.edit}</button></div><h1 className="mt-3 text-2xl font-black">Luis Hernandez</h1><p className="text-sm text-white/60">Los Angeles · 26 · Español, English</p><p className="mt-3 text-sm leading-6 text-white/80">Diseñando una vida que se sienta auténtica. Me gustan las conversaciones que empiezan sin presión.</p><div className="mt-4 flex gap-5 text-sm"><span><b>12</b> publicaciones</span><span><b>48</b> matches</span><span><b>1.2k</b> vistas</span></div></div></section><section className="blynk-card rounded-3xl p-5"><div className="flex items-center justify-between"><h2 className="font-black">{t.gallery}</h2><label className="soft-button cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">+ {t.addMedia}<input onChange={uploadMedia} className="hidden" multiple type="file" accept="image/*,video/*" /></label></div><div className="mt-4 grid grid-cols-3 gap-2">{media.map((source) => <div key={source} role="img" aria-label="Contenido del perfil" className="aspect-square rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${source})` }} />)}{media.length === 0 && <p className="col-span-3 rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm text-white/45">{language === "es" ? "Añade hasta 6 fotos o videos para completar tu perfil." : "Add up to 6 photos or videos to complete your profile."}</p>}</div></section><section className="blynk-card rounded-3xl p-5"><div className="flex items-center justify-between"><h2 className="font-black">{t.settings}</h2><select value={privacy} onChange={(event) => setPrivacy(event.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"><option>{t.public}</option><option>{t.private}</option><option>{t.hidden}</option></select></div><button onClick={() => notify(language === "es" ? "Sesión cerrada en este prototipo" : "Signed out in this prototype")} className="mt-4 text-sm font-bold text-rose-300">↪ {t.logOut}</button></section></div>}
      </section>
      <aside className="hidden lg:block"><div className="blynk-card sticky top-24 rounded-3xl p-5"><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Pro</p><h2 className="mt-2 text-lg font-black">Tu perfil está al 78%</h2><p className="mt-2 text-sm leading-5 text-white/55">Agrega un video de presentación y recibe más conexiones relevantes.</p><button onClick={() => setTab("profile")} className="soft-button mt-4 w-full rounded-xl bg-white/10 py-3 text-sm font-bold">{t.profileReady}</button></div></aside>
    </div>
    <nav className="mobile-safe fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/10 bg-[#0b0b17ef] px-3 py-2 backdrop-blur-xl lg:hidden">{([ ["discover", "▷"], ["community", "◎"], ["messages", "✉"], ["profile", "◌"] ] as [Tab, string][]).map(([key, icon]) => <button key={key} onClick={() => setTab(key)} className={`grid place-items-center gap-1 px-2 py-1 text-[10px] font-bold ${tab === key ? "text-pink-300" : "text-white/45"}`}><span className="text-xl">{icon}</span>{t[key]}</button>)}</nav>
    {incomingAlert && <button onClick={() => { setTab("messages"); setIncomingAlert(null); }} className="fixed left-1/2 top-20 z-[70] flex w-[min(92vw,380px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-pink-300/35 bg-[#19162af5] p-3 text-left shadow-[0_16px_50px_#000a] backdrop-blur-xl"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-400 to-violet-500 text-xl shadow-[0_0_20px_#f13ab599]">◉</span><span className="min-w-0"><b className="block text-sm text-pink-100">Blynk · {incomingAlert.name}</b><small className="mt-0.5 block truncate text-white/65">{incomingAlert.hasMedia ? (language === "es" ? "Te envió una foto o video" : "Sent you a photo or video") : (language === "es" ? "Te envió un mensaje" : "Sent you a message")}</small></span><span className="ml-auto text-xs text-pink-200">›</span></button>}
    {safetyAction && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); void submitSafetyAction(); }} className="blynk-card w-full max-w-md rounded-[2rem] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Safety</p><h2 className="mt-1 text-2xl font-black">{safetyAction.kind === "report" ? (language === "es" ? "Reportar perfil" : "Report profile") : (language === "es" ? "Bloquear perfil" : "Block profile")}</h2><p className="mt-2 text-sm text-white/60">{safetyAction.targetName}</p></div><button type="button" onClick={() => setSafetyAction(null)} className="rounded-full p-2 text-white/60">×</button></div><label className="mt-6 block text-sm font-bold">{language === "es" ? "¿Cuál es el motivo?" : "What is the reason?"}<select required value={safetyReason} onChange={(event) => setSafetyReason(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#151525] px-4 py-3 text-white outline-none"><option value="">{language === "es" ? "Selecciona un motivo" : "Select a reason"}</option><option value="Harassment or abusive behavior">{language === "es" ? "Acoso o comportamiento abusivo" : "Harassment or abusive behavior"}</option><option value="Inappropriate content">{language === "es" ? "Contenido inapropiado" : "Inappropriate content"}</option><option value="Spam or scam">{language === "es" ? "Spam o posible estafa" : "Spam or scam"}</option><option value="Impersonation or fake profile">{language === "es" ? "Suplantación o perfil falso" : "Impersonation or fake profile"}</option><option value="Underage concern">{language === "es" ? "Posible persona menor de edad" : "Underage concern"}</option><option value="I no longer want contact">{language === "es" ? "No deseo seguir en contacto" : "I no longer want contact"}</option><option value="Other safety concern">{language === "es" ? "Otra preocupación de seguridad" : "Other safety concern"}</option></select></label><p className="mt-3 text-xs leading-5 text-white/50">{safetyAction.kind === "report" ? (language === "es" ? "El reporte será revisado por el equipo de Blynk." : "The report will be reviewed by the Blynk team.") : (language === "es" ? "La persona no recibirá el motivo. Dejará de aparecer y de poder enviarte mensajes." : "The person will not see the reason. They will no longer appear or be able to message you.")}</p><button disabled={!safetyReason} className={`soft-button mt-5 w-full rounded-xl py-3.5 font-bold disabled:opacity-50 ${safetyAction.kind === "block" ? "bg-rose-500/80" : "pink-gradient"}`}>{safetyAction.kind === "report" ? (language === "es" ? "Enviar reporte" : "Send report") : (language === "es" ? "Confirmar bloqueo" : "Confirm block")}</button></form></div>}
    {accountNotice && <div className="fixed inset-0 z-[85] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Blynk Safety" className="blynk-card w-full max-w-md rounded-[2rem] p-7 text-center"><span className={`mx-auto grid size-16 place-items-center rounded-3xl text-3xl ${accountNotice.notice_type === "profile_suspended" ? "bg-rose-400/15 text-rose-200" : "bg-emerald-400/15 text-emerald-200"}`}>{accountNotice.notice_type === "profile_suspended" ? "⚠" : "✓"}</span><p className="mt-5 text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Safety</p><h2 className="mt-2 text-2xl font-black">{accountNotice.notice_type === "profile_suspended" ? (language === "es" ? "Tu perfil fue suspendido" : "Your profile was suspended") : (language === "es" ? "Tu perfil fue restaurado" : "Your profile was restored")}</h2><p className="mt-3 text-sm leading-6 text-white/65">{accountNotice.notice_type === "profile_suspended" ? (language === "es" ? "Tu perfil dejó de aparecer en Descubrir mientras Blynk revisa los reportes. Si crees que fue un error, contáctanos para solicitar una revisión." : "Your profile no longer appears in Discover while Blynk reviews reports. If you believe this was a mistake, contact us to request a review.") : (language === "es" ? "Después de la revisión, tu perfil vuelve a estar disponible en Descubrir." : "After review, your profile is available in Discover again.")}</p><button onClick={() => void dismissAccountNotice()} className="pink-gradient soft-button mt-6 w-full rounded-xl py-3.5 font-bold">{language === "es" ? "Entendido" : "Got it"}</button></section></div>}
    {toast && <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#171322] shadow-xl lg:bottom-8">{toast}</div>}
    {tab === "profile" && <button onClick={() => setPreviewingOwnProfile(true)} className="fixed right-4 top-32 z-40 rounded-full border border-pink-300/30 bg-[#1b1a2b]/95 px-4 py-2 text-xs font-black text-pink-200 shadow-xl backdrop-blur">◉ {language === "es" ? "Vista pública" : "Public view"}</button>}
    {matchRequests.some((request) => request.incoming && request.status === "pending") && <aside className="fixed bottom-20 right-4 z-40 w-72 rounded-3xl border border-white/15 bg-[#151525f5] p-4 shadow-2xl backdrop-blur-xl sm:bottom-6"><div className="flex items-center justify-between"><p className="text-sm font-black text-pink-300">{language === "es" ? "Solicitudes" : "Requests"}</p><button onClick={() => void loadMatches()} className="text-xs text-white/50">↻</button></div><div className="mt-3 space-y-2">{matchRequests.filter((request) => request.incoming && request.status === "pending").map((request) => <div key={request.id} className="rounded-2xl bg-white/5 p-3"><p className="text-sm font-bold">{request.otherName}</p><p className="mt-1 text-xs text-white/50">{language === "es" ? "Quiere conectar contigo" : "Wants to connect"}</p><div className="mt-3 flex gap-2"><button onClick={() => void respondToMatch(request, "rejected")} className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-bold">×</button><button onClick={() => void respondToMatch(request, "accepted")} className="pink-gradient flex-1 rounded-xl py-2 text-xs font-bold">✓</button></div></div>)}</div></aside>}
    {tab === "profile" && <section className="fixed inset-x-0 bottom-0 top-[57px] z-20 overflow-y-auto bg-[#090914] px-4 pb-32 pt-6 lg:px-6"><div className="mx-auto max-w-xl space-y-4"><article className="blynk-card overflow-hidden rounded-[2rem]"><div className="h-32 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-violet-700" style={myProfile.coverUrl ? { backgroundImage: `linear-gradient(#09091433, #09091455), url(${myProfile.coverUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} /><div className="px-6 pb-6"><div className="-mt-12 flex items-end justify-between"><label className="group relative grid size-24 cursor-pointer place-items-center overflow-hidden rounded-3xl border-4 border-[#151525] bg-gradient-to-br from-amber-300 to-rose-500 text-3xl font-black"><input onChange={uploadAvatar} className="hidden" type="file" accept="image/*" />{myProfile.avatarUrl ? <img src={myProfile.avatarUrl} alt="Foto de perfil" className="size-full object-cover" /> : (myProfile.displayName || "B").slice(0, 1).toUpperCase()}<span className="absolute inset-x-1 bottom-1 rounded-lg bg-black/65 py-1 text-center text-[10px] font-bold opacity-0 transition group-hover:opacity-100">Cambiar</span></label><button onClick={() => setEditingProfile(true)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">✎ {t.edit}</button></div><h1 className="mt-4 text-3xl font-black">{myProfile.displayName || "Cargando…"}</h1><p className="mt-1 text-sm text-pink-300">@{myProfile.username || "sin_usuario"}</p><p className="mt-1 text-sm text-white/55">{myProfile.email}</p><p className="mt-5 text-sm leading-6 text-white/80">{myProfile.bio || (language === "es" ? "Completa tu presentación para conectar mejor." : "Complete your bio to connect better.")}</p></div></article><article className="blynk-card rounded-3xl p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">{t.gallery}</h2><p className="mt-1 text-xs text-white/50">{language === "es" ? "Hasta 6 fotos o videos visibles en tu perfil." : "Up to 6 photos or videos visible on your profile."}</p></div><label className="soft-button cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">+ {t.addMedia}<input onChange={uploadMedia} className="hidden" multiple type="file" accept="image/*,video/*" /></label></div><div className="mt-4 grid grid-cols-3 gap-2">{media.map((source) => <div key={source} className="aspect-square overflow-hidden rounded-xl bg-white/5">{/\.(mp4|webm|mov)(\?|$)/i.test(source) ? <video src={source} className="size-full object-cover" muted playsInline /> : <img src={source} alt="Contenido del perfil" className="size-full object-cover" />}</div>)}{media.length === 0 && <p className="col-span-3 rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm text-white/45">{language === "es" ? "Agrega fotos o videos para que otras personas te conozcan." : "Add photos or videos so others can get to know you."}</p>}</div></article><article className="blynk-card rounded-3xl p-5"><h2 className="font-black">{language === "es" ? "Privacidad y cuenta" : "Privacy and account"}</h2><p className="mt-2 text-sm text-white/55">{language === "es" ? "Tu nombre, usuario, foto y galería se guardan para esta cuenta." : "Your name, username, photo and gallery are saved for this account."}</p><button onClick={() => void signOut()} className="mt-5 text-sm font-bold text-rose-300">↪ {t.logOut}</button></article></div></section>}
    {editingProfile && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={saveProfile} className="blynk-card max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[2rem] p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{t.edit} {t.profile}</h2><button type="button" onClick={() => setEditingProfile(false)} className="rounded-full p-2 text-white/60">×</button></div><label className="mt-5 block text-sm font-bold">{language === "es" ? "Nombre" : "Name"}<input value={myProfile.displayName} onChange={(event) => setMyProfile((profile) => ({ ...profile, displayName: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none" /></label><label className="mt-4 block text-sm font-bold">{language === "es" ? "Usuario" : "Username"}<input value={myProfile.username} onChange={(event) => setMyProfile((profile) => ({ ...profile, username: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none" /></label><label className="mt-4 block text-sm font-bold">{language === "es" ? "Ciudad" : "City"}<input value={myProfile.city} onChange={(event) => setMyProfile((profile) => ({ ...profile, city: event.target.value }))} placeholder={language === "es" ? "Tu ciudad" : "Your city"} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none" /></label><label className="mt-4 block text-sm font-bold">{language === "es" ? "Qué buscas" : "What are you looking for"}<select value={myProfile.connectionIntent} onChange={(event) => setMyProfile((profile) => ({ ...profile, connectionIntent: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none"><option value="">{language === "es" ? "Seleccionar" : "Select"}</option><option value="Intentional dating">{language === "es" ? "Citas intencionales" : "Intentional dating"}</option><option value="New friendships">{language === "es" ? "Nuevas amistades" : "New friendships"}</option><option value="Open to meeting people">{language === "es" ? "Conocer personas" : "Open to meeting people"}</option></select></label><fieldset className="mt-4"><legend className="text-sm font-bold">{language === "es" ? "Intereses (hasta 5)" : "Interests (up to 5)"}</legend><div className="mt-2 flex flex-wrap gap-2">{["Art", "Coffee", "Fitness", "Food", "Music", "Movies", "Outdoors", "Travel"].map((interest) => <button key={interest} type="button" onClick={() => setMyProfile((profile) => ({ ...profile, interests: profile.interests.includes(interest) ? profile.interests.filter((value) => value !== interest) : [...profile.interests, interest].slice(0, 5) }))} className={`rounded-full border px-3 py-2 text-xs font-bold ${myProfile.interests.includes(interest) ? "border-pink-400 bg-pink-400/15 text-pink-100" : "border-white/10 bg-white/5 text-white/65"}`}>{interest}</button>)}</div></fieldset><label className="mt-4 block text-sm font-bold">{language === "es" ? "Biografía" : "Bio"}<textarea value={myProfile.bio} onChange={(event) => setMyProfile((profile) => ({ ...profile, bio: event.target.value }))} maxLength={500} className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-black/20 p-4 outline-none" /></label><button disabled={savingProfile} className="pink-gradient soft-button mt-5 w-full rounded-xl py-3.5 font-bold disabled:opacity-60">{savingProfile ? (language === "es" ? "Guardando…" : "Saving…") : (language === "es" ? "Guardar cambios" : "Save changes")}</button></form></div>}
    {tab === "profile" && <nav aria-label="Navegación del perfil" className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-xl gap-2 rounded-2xl border border-white/15 bg-[#1b1a2b]/95 p-2 shadow-2xl backdrop-blur lg:bottom-7"><button onClick={() => setTab("discover")} className="flex-1 rounded-xl px-3 py-2 text-xs font-bold text-pink-200 hover:bg-white/10">⌕ {t.discover}</button><button onClick={() => setTab("community")} className="flex-1 rounded-xl px-3 py-2 text-xs font-bold text-pink-200 hover:bg-white/10">◎ {t.community}</button><button onClick={() => setTab("messages")} className="flex-1 rounded-xl px-3 py-2 text-xs font-bold text-pink-200 hover:bg-white/10">✉ {t.messages}</button></nav>}
    {tab === "profile" && <label className="fixed left-4 top-20 z-40 cursor-pointer rounded-full border border-pink-300/30 bg-[#1b1a2b]/95 px-4 py-2 text-xs font-black text-pink-200 shadow-xl backdrop-blur">▧ {language === "es" ? "Foto de fondo" : "Cover photo"}<input onChange={uploadCover} className="hidden" type="file" accept="image/*" /></label>}
    {tab === "profile" && <button onClick={() => setBlockedListOpen(true)} className="fixed left-4 top-32 z-40 rounded-full border border-white/15 bg-[#1b1a2b]/95 px-4 py-2 text-xs font-black text-white/75 shadow-xl backdrop-blur">⊘ {language === "es" ? `Bloqueados (${blockedProfiles.length})` : `Blocked (${blockedProfiles.length})`}</button>}
    {tab === "profile" && <button onClick={() => setPresentationOpen(true)} className="fixed right-4 top-20 z-40 rounded-full border border-pink-300/30 bg-[#1b1a2b]/95 px-4 py-2 text-xs font-black text-pink-200 shadow-xl backdrop-blur">▶ Video de presentación</button>}
    {presentationOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Video de presentación" className="blynk-card w-full max-w-lg rounded-[2rem] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Tu perfil</p><h2 className="mt-1 text-2xl font-black">Video de presentación</h2><p className="mt-2 text-sm text-white/55">Este video se mostrará a las personas antes de que decidan enviarte una solicitud.</p></div><button onClick={() => setPresentationOpen(false)} className="rounded-full p-2 text-white/60">×</button></div>{presentationVideo && <video src={presentationVideo} className="mt-5 aspect-video w-full rounded-2xl bg-black object-cover" controls muted playsInline />}<label className="mt-5 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-pink-300/40 bg-pink-400/5 px-4 py-5 text-sm font-bold text-pink-100">▣ Elegir video<input onChange={selectPresentationVideo} className="hidden" type="file" accept="video/mp4,video/webm,video/quicktime" /></label><button disabled={!presentationVideoFile || uploadingPresentation} onClick={() => void savePresentationVideo()} className="pink-gradient soft-button mt-4 w-full rounded-2xl py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-50">{uploadingPresentation ? "Subiendo…" : "Publicar como video de presentación"}</button></section></div>}
    {matchRequests.some((request) => request.incoming && request.status === "pending") && <button onClick={() => setReviewingRequest(matchRequests.find((request) => request.incoming && request.status === "pending") || null)} className="fixed left-4 top-20 z-40 rounded-full border border-pink-300/30 bg-[#1b1a2b]/95 px-4 py-2 text-xs font-black text-pink-200 shadow-xl backdrop-blur">♥ Nueva solicitud · Ver perfil</button>}
    {reviewingRequest && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Revisar solicitud de match" className="blynk-card w-full max-w-md overflow-hidden rounded-[2rem]"><div className="relative aspect-[16/10] bg-gradient-to-br from-pink-500/50 via-violet-600/40 to-slate-900">{reviewingRequest.otherVideoUrl ? <video src={reviewingRequest.otherVideoUrl} className="size-full object-cover" controls autoPlay muted loop playsInline /> : <div className="grid size-full place-items-center text-5xl">✦</div>}<button onClick={() => setReviewingRequest(null)} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white">×</button></div><div className="p-6"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-300 to-rose-500 font-black">{reviewingRequest.otherAvatarUrl ? <img src={reviewingRequest.otherAvatarUrl} alt="" className="size-full object-cover" /> : reviewingRequest.otherName.slice(0, 1).toUpperCase()}</span><div><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Solicitud de match</p><h2 className="text-2xl font-black">{reviewingRequest.otherName}</h2></div></div><p className="mt-4 text-sm leading-6 text-white/75">{reviewingRequest.otherBio || "Esta persona aún no ha añadido una biografía."}</p><p className="mt-3 text-xs text-white/45">Revisa su video y perfil antes de decidir.</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => { void respondToMatch(reviewingRequest, "rejected"); setReviewingRequest(null); }} className="soft-button rounded-2xl border border-white/15 bg-white/5 py-3 font-bold">× Rechazar</button><button onClick={() => { void respondToMatch(reviewingRequest, "accepted"); setReviewingRequest(null); }} className="pink-gradient soft-button rounded-2xl py-3 font-bold">♥ Aceptar match</button></div></div></section></div>}
    {viewingProfile && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Perfil" className="blynk-card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[2rem]"><div className="relative aspect-[16/10] bg-gradient-to-br from-pink-500/50 via-violet-600/40 to-slate-900">{viewingProfile.person.video ? <video src={viewingProfile.person.video} className="size-full object-cover" controls autoPlay muted loop playsInline /> : null}<button onClick={() => setViewingProfile(null)} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white">×</button></div><div className="p-6"><div className="flex items-center gap-3"><span className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-300 to-rose-500 text-xl font-black">{viewingProfile.person.avatarUrl ? <img src={viewingProfile.person.avatarUrl} alt="" className="size-full object-cover" /> : viewingProfile.person.name.slice(0, 1).toUpperCase()}</span><div><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Perfil verificado</p><h2 className="text-2xl font-black">{viewingProfile.person.name}, {viewingProfile.person.age}</h2><p className="text-sm text-white/55">{viewingProfile.person.place}</p></div></div><p className="mt-4 text-sm leading-6 text-white/80">{viewingProfile.person.intro}</p>{viewingProfile.media.length > 0 && <div className="mt-5 grid grid-cols-3 gap-2">{viewingProfile.media.map((source) => <div key={source} className="aspect-square overflow-hidden rounded-xl bg-white/5">{/\.(mp4|webm|mov)(\?|$)/i.test(source) ? <video src={source} className="size-full object-cover" muted playsInline /> : <img src={source} alt="Contenido del perfil" className="size-full object-cover" />}</div>)}</div>}<button onClick={() => { void requestMatch(); setViewingProfile(null); }} className="pink-gradient soft-button mt-6 w-full rounded-2xl py-3.5 font-bold">♥ {t.request}</button></div></section></div>}
    {previewingOwnProfile && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label={language === "es" ? "Vista pública del perfil" : "Public profile preview"} className="blynk-card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[2rem]"><div className="relative h-40 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-violet-700" style={myProfile.coverUrl ? { backgroundImage: `linear-gradient(#09091433, #09091455), url(${myProfile.coverUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}><button onClick={() => setPreviewingOwnProfile(false)} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white">×</button></div><div className="px-6 pb-6"><span className="-mt-12 grid size-24 place-items-center overflow-hidden rounded-3xl border-4 border-[#151525] bg-gradient-to-br from-amber-300 to-rose-500 text-3xl font-black">{myProfile.avatarUrl ? <img src={myProfile.avatarUrl} alt="" className="size-full object-cover" /> : (myProfile.displayName || "B").slice(0, 1).toUpperCase()}</span><p className="mt-4 text-xs font-bold uppercase tracking-widest text-pink-300">{language === "es" ? "Vista pública" : "Public view"}</p><h2 className="mt-1 text-3xl font-black">{myProfile.displayName || "Blynk user"}</h2><p className="mt-1 text-sm text-pink-200">@{myProfile.username || "blynk"}</p>{myProfile.city && <p className="mt-2 text-sm text-white/55">⌖ {myProfile.city}</p>}<p className="mt-5 text-sm leading-6 text-white/80">{myProfile.bio || (language === "es" ? "Esta persona aún no añadió una biografía." : "This person has not added a bio yet.")}</p>{myProfile.interests.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{myProfile.interests.map((interest) => <span key={interest} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold">{interest}</span>)}</div>}{presentationVideo && <div className="mt-5 overflow-hidden rounded-2xl bg-black"><video src={presentationVideo} className="aspect-video w-full object-cover" controls muted playsInline /></div>}<div className="mt-5 grid grid-cols-3 gap-2">{media.map((source) => <div key={source} className="aspect-square overflow-hidden rounded-xl bg-white/5">{/\.(mp4|webm|mov)(\?|$)/i.test(source) ? <video src={source} className="size-full object-cover" muted playsInline /> : <img src={source} alt="" className="size-full object-cover" />}</div>)}</div><p className="mt-5 rounded-xl border border-pink-300/20 bg-pink-400/10 p-3 text-center text-xs leading-5 text-pink-100">{language === "es" ? "Así verán tu perfil las demás personas. Tu correo nunca es visible." : "This is how other people see your profile. Your email is never visible."}</p></div></section></div>}
  </main>;
}
