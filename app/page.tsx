"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Tab = "discover" | "community" | "messages" | "profile";
type Language = "es" | "en";
type CommunityPost = { id: string | number; author: string; initial: string; time: string; text: string; video?: string; likes: number; commentsEnabled: boolean; comments: string[] };
type StoredPost = { id: string; caption: string | null; video_url: string | null; created_at: string; profiles: { display_name: string }[] | null };
type StoredComment = { post_id: string; content: string };
type StoredLike = { post_id: string };
type DiscoverPerson = { id: string; name: string; age: number; place: string; emoji: string; accent: string; intro: string; tags: string[]; video: string; avatarUrl?: string };
type MatchRequest = { id: string; otherId: string; otherName: string; otherBio?: string; otherAvatarUrl?: string; otherVideoUrl?: string; incoming: boolean; status: "pending" | "accepted" | "rejected" };

const people: DiscoverPerson[] = [
  { id: "sofia", name: "Sofía", age: 24, place: "Ciudad de México", emoji: "☕", accent: "from-orange-400 via-rose-500 to-violet-700", intro: "Una caminata, un café y una conversación sin prisa.", tags: ["Viajes", "Fotografía", "Café"], video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
  { id: "mila", name: "Mila", age: 26, place: "Barcelona", emoji: "🎨", accent: "from-fuchsia-600 via-purple-600 to-sky-700", intro: "Arte, mar y una playlist que cambia cada viernes.", tags: ["Arte", "Música", "Yoga"], video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
  { id: "camila", name: "Camila", age: 25, place: "Medellín", emoji: "🌿", accent: "from-emerald-500 via-teal-700 to-slate-900", intro: "Me gusta descubrir lugares nuevos y reír sin filtros.", tags: ["Senderismo", "Cine", "Comida"], video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
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
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([{ id: 1, author: "Luis Hernandez", initial: "L", time: "Ahora", text: "Busco una conversación honesta. ¿Cuál es el mejor consejo que te han dado?", likes: 4, commentsEnabled: true, comments: ["Me encanta esa pregunta ✨"] }]);
  const [postVideo, setPostVideo] = useState("");
  const [postVideoFile, setPostVideoFile] = useState<File | null>(null);
  const [uploadingPost, setUploadingPost] = useState(false);
  const [comment, setComment] = useState("");
  const [menu, setMenu] = useState<string | number | null>(null);
  const [chat, setChat] = useState([{ from: "Sofía", text: "¡Hola! Me gustó tu video de presentación." }, { from: "me", text: "¡Gracias! El tuyo se ve increíble." }]);
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState("Público");
  const [registeredPeople, setRegisteredPeople] = useState<DiscoverPerson[]>([]);
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const [inboxMatchIds, setInboxMatchIds] = useState<string[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchRequest | null>(null);
  const [viewingProfile, setViewingProfile] = useState<{ person: DiscoverPerson; media: string[] } | null>(null);
  const [reviewingRequest, setReviewingRequest] = useState<MatchRequest | null>(null);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [presentationVideo, setPresentationVideo] = useState("");
  const [presentationVideoFile, setPresentationVideoFile] = useState<File | null>(null);
  const [uploadingPresentation, setUploadingPresentation] = useState(false);
  const [myProfile, setMyProfile] = useState({ displayName: "", username: "", bio: "", email: "", avatarUrl: "", coverUrl: "", presentationVideoUrl: "" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const startY = useRef(0);
  const t = copy[language];
  const discoverPeople = registeredPeople.length ? registeredPeople : people;
  const person = discoverPeople[personIndex % discoverPeople.length];
  const conversationName = activeMatch?.otherName || (language === "es" ? "Selecciona un match" : "Select a match");
  const hasReceivedMessage = chat.some((item) => item.from !== "me");

  const notify = (value: string) => { setToast(value); window.setTimeout(() => setToast(""), 2600); };
  const nextPerson = () => setPersonIndex((value) => (value + 1) % discoverPeople.length);
  const openPublicProfile = async (selected: DiscoverPerson) => {
    setViewingProfile({ person: selected, media: [] });
    if (!supabase || selected.id.length < 20) return;
    const { data } = await supabase.from("profile_media").select("media_url").eq("user_id", selected.id).order("created_at", { ascending: true }).limit(6);
    setViewingProfile({ person: selected, media: (data || []).map((item) => item.media_url) });
  };
  const onTouchStart = (event: React.TouchEvent) => { startY.current = event.touches[0].clientY; };
  const onTouchEnd = (event: React.TouchEvent) => { if (startY.current - event.changedTouches[0].clientY > 55) nextPerson(); };
  const addPost = async () => {
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
    setPosts((items) => [{ id: Date.now(), author: "Luis Hernandez", initial: "L", time: "Ahora", text: postText.trim(), video: publishedVideo || undefined, likes: 0, commentsEnabled: true, comments: [] }, ...items]);
    setPostText(""); setPostVideo(""); setPostVideoFile(null); setUploadingPost(false);
    notify(language === "es" ? "Publicación compartida" : "Post shared");
  };
  const addComment = async (postId: string | number) => {
    const content = comment.trim();
    if (!content) return;
    if (isSupabaseConfigured && supabase && typeof postId === "string") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { notify(language === "es" ? "Inicia sesión para comentar." : "Sign in to comment."); return; }
      const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content });
      if (error) { notify(`${language === "es" ? "No se pudo publicar el comentario" : "Could not post the comment"}: ${error.message}`); return; }
    }
    setPosts((items) => items.map((post) => post.id === postId ? { ...post, comments: [...post.comments, content] } : post));
    setComment("");
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
    setMatchRequests(parsedRequests);
    const acceptedIds = parsedRequests.filter((request) => request.status === "accepted").map((request) => request.otherId);
    if (!acceptedIds.length) { setInboxMatchIds([]); return; }
    const { data: inboxRows } = await supabase.from("messages").select("sender_id").eq("receiver_id", user.id).in("sender_id", acceptedIds);
    setInboxMatchIds([...new Set((inboxRows || []).map((message) => message.sender_id))]);
  };
  const requestMatch = async () => {
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
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: myProfile.displayName.trim(), username, bio: myProfile.bio.trim() });
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
    const { data } = await supabase.from("messages").select("sender_id, content").or(`and(sender_id.eq.${user.id},receiver_id.eq.${request.otherId}),and(sender_id.eq.${request.otherId},receiver_id.eq.${user.id})`).order("created_at", { ascending: true });
    const loadedMessages = (data || []).map((item) => ({ from: item.sender_id === user.id ? "me" : request.otherName, text: item.content || "" }));
    setChat(loadedMessages);
    if (loadedMessages.some((item) => item.from !== "me")) {
      setActiveMatch(request);
    } else {
      setActiveMatch(null);
      notify(language === "es" ? "La conversación aparecerá cuando tu match te envíe un mensaje." : "The conversation will appear when your match sends you a message.");
    }
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
  const sendMessage = async (event: FormEvent) => { event.preventDefault(); const content = message.trim(); if (!content) return; if (activeMatch && supabase) { const { data: { user } } = await supabase.auth.getUser(); if (!user) { notify(language === "es" ? "Inicia sesión para enviar mensajes." : "Sign in to message."); return; } const { error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: activeMatch.otherId, content }); if (error) { notify(error.message); return; } } setChat((items) => [...items, { from: "me", text: content }]); setMessage(""); };

  // Keyboard listener is intentionally installed once for the screen lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "ArrowDown") nextPerson(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
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
      const { data } = await client.from("profiles").select("display_name, username, bio, avatar_url, cover_url, presentation_video_url, onboarding_completed").eq("id", user.id).maybeSingle();
      if (!data?.onboarding_completed && !data?.bio) { router.replace("/onboarding"); return; }
      setMyProfile({ displayName: data?.display_name || user.user_metadata.display_name || user.email?.split("@")[0] || "Blynk user", username: data?.username || "", bio: data?.bio || "", email: user.email || "", avatarUrl: data?.avatar_url || "", coverUrl: data?.cover_url || "", presentationVideoUrl: data?.presentation_video_url || "" });
      setPresentationVideo(data?.presentation_video_url || "");
      const { data: gallery } = await client.from("profile_media").select("media_url").eq("user_id", user.id).order("created_at", { ascending: true }).limit(6);
      if (gallery) setMedia(gallery.map((item) => item.media_url));
    }
    void loadMyProfile();
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    async function loadRegisteredPeople() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const { data } = await client.from("profiles").select("id, display_name, bio, avatar_url, presentation_video_url").neq("id", user.id).limit(25);
      if (!data?.length) return;
      const accents = ["from-orange-400 via-rose-500 to-violet-700", "from-fuchsia-600 via-purple-600 to-sky-700", "from-emerald-500 via-teal-700 to-slate-900"];
      setRegisteredPeople(data.map((profile, index) => ({ id: profile.id, name: profile.display_name || "Blynk user", age: 18, place: language === "es" ? "Blynk" : "Blynk", emoji: "✦", accent: accents[index % accents.length], intro: profile.bio || (language === "es" ? "Perfil listo para conectar." : "A profile ready to connect."), tags: [language === "es" ? "Nuevo" : "New"], video: profile.presentation_video_url || "", avatarUrl: profile.avatar_url || "" })));
    }
    void loadRegisteredPeople();
  }, [language]);
  // Refreshes the signed-in person's incoming/outgoing match requests on load.
  useEffect(() => {
    async function refreshMatches() { await loadMatches(); }
    void refreshMatches();
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    async function loadCommunity() {
      const { data, error } = await client.from("posts").select("id, caption, video_url, created_at, profiles(display_name)").order("created_at", { ascending: false }).limit(30);
      if (error || !data?.length) return;
      const storedPosts = data as unknown as StoredPost[];
      const postIds = storedPosts.map((post) => post.id);
      const [{ data: likes }, { data: comments }] = await Promise.all([
        client.from("likes").select("post_id").in("post_id", postIds),
        client.from("comments").select("post_id, content").in("post_id", postIds).order("created_at", { ascending: true }),
      ]);
      const likesByPost = (likes as unknown as StoredLike[] | null)?.reduce<Record<string, number>>((total, like) => ({ ...total, [like.post_id]: (total[like.post_id] || 0) + 1 }), {}) || {};
      const commentsByPost = (comments as unknown as StoredComment[] | null)?.reduce<Record<string, string[]>>((total, entry) => ({ ...total, [entry.post_id]: [...(total[entry.post_id] || []), entry.content] }), {}) || {};
      setPosts(storedPosts.map((post) => { const displayName = post.profiles?.[0]?.display_name || "Blynk user"; return { id: post.id, author: displayName, initial: displayName.slice(0, 1).toUpperCase(), time: new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", { dateStyle: "medium" }).format(new Date(post.created_at)), text: post.caption || "", video: post.video_url || undefined, likes: likesByPost[post.id] || 0, commentsEnabled: true, comments: commentsByPost[post.id] || [] }; }));
    }
    void loadCommunity();
  }, [language]);

  return <main className="blynk-shell min-h-screen">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090914e8] backdrop-blur-xl"><div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6"><button onClick={() => setTab("discover")} className="flex items-center gap-2 text-xl font-black tracking-tight"><span aria-hidden="true" className="drop-shadow-[0_0_8px_#f13ab5]"><svg viewBox="0 0 96 58" className="h-7 w-9"><defs><linearGradient id="blynk-mini-eye" x1="0" x2="1"><stop stopColor="#ff4fac"/><stop offset="1" stopColor="#a855f7"/></linearGradient></defs><path d="M3 29C16 11 31 3 48 3s32 8 45 26C80 47 65 55 48 55S16 47 3 29Z" fill="url(#blynk-mini-eye)"/><path d="M13 29C24 18 35 13 48 13s24 5 35 16C72 40 61 45 48 45S24 40 13 29Z" fill="#fff4fb"/><circle cx="48" cy="29" r="11" fill="#18bfc9"/><circle cx="48" cy="29" r="6" fill="#07101e"/><circle cx="44" cy="25" r="2.5" fill="white"/></svg></span><span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">Blynk</span></button><span aria-label="Ojo Blynk" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_14px_#f13ab5]"><svg viewBox="0 0 96 58" className="h-10 w-16 sm:h-12 sm:w-20" role="img"><defs><linearGradient id="blynk-eye" x1="0" x2="1"><stop stopColor="#ff4fac"/><stop offset="1" stopColor="#a855f7"/></linearGradient><radialGradient id="blynk-iris"><stop stopColor="#d8ffff"/><stop offset=".42" stopColor="#46e4e2"/><stop offset=".72" stopColor="#117f9c"/><stop offset="1" stopColor="#071726"/></radialGradient></defs><path d="M3 29C16 11 31 3 48 3s32 8 45 26C80 47 65 55 48 55S16 47 3 29Z" fill="url(#blynk-eye)"/><path d="M10 29C21 16 34 10 48 10s27 6 38 19C75 42 62 48 48 48S21 42 10 29Z" fill="#fff4fb"/><circle cx="48" cy="29" r="16" fill="url(#blynk-iris)"/><circle cx="48" cy="29" r="8" fill="#07101e"/><circle cx="42" cy="23" r="4" fill="white"/><circle cx="54" cy="35" r="2" fill="#baffff"/></svg></span><div className="flex items-center gap-2"><select aria-label="Idioma" value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"><option value="es">ES</option><option value="en">EN</option></select><a href="/login" className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white sm:block">{language === "es" ? "Ingresar" : "Sign in"}</a></div></div></header>
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-24 pt-6 md:px-6 lg:grid-cols-[185px_minmax(0,1fr)_260px]">
      <aside className="hidden lg:block"><nav className="blynk-card sticky top-24 space-y-1 rounded-3xl p-2">{([ ["discover", "▷"], ["community", "◎"], ["messages", "✉"], ["profile", "◌"] ] as [Tab, string][]).map(([key, icon]) => <button key={key} onClick={() => setTab(key)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold ${tab === key ? "bg-white/10 text-pink-300" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><span>{icon}</span>{t[key]}</button>)}</nav></aside>
      <section className="min-w-0">
        {tab === "discover" && <div className="mx-auto max-w-md" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}><div className="mb-4 grid grid-cols-2 rounded-2xl bg-white/5 p-1 text-center text-sm font-bold"><button className="rounded-xl bg-white/10 py-3 text-pink-300">{t.forYou}</button><button className="py-3 text-white/45">{t.nearby}</button></div><article onClick={() => void openPublicProfile(person)} className="blynk-card relative aspect-[9/14] cursor-pointer overflow-hidden rounded-[2rem]" aria-label={`${person.name}, ${person.age}`}>{person.video ? <video key={person.id} className="absolute inset-0 size-full object-cover" src={person.video} autoPlay muted loop playsInline /> : person.avatarUrl ? <img src={person.avatarUrl} alt={`Foto de ${person.name}`} className="absolute inset-0 size-full object-cover" /> : <div className={`absolute inset-0 grid place-items-center bg-gradient-to-br text-7xl ${person.accent}`}>{person.emoji}</div>}<div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#080812]/90 via-[#080812]/35 to-transparent" /><button onClick={(event) => { event.stopPropagation(); notify(language === "es" ? "Perfil guardado" : "Profile saved"); }} className="soft-button absolute right-4 top-4 grid size-11 place-items-center rounded-full border border-white/15 bg-black/35 text-lg backdrop-blur" aria-label={language === "es" ? "Me gusta" : "Like"}>♡</button><div className="absolute inset-x-0 bottom-0 p-6"><span className="mb-3 inline-flex rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-100">● ONLINE</span><h1 className="text-3xl font-black">{person.name}, {person.age}</h1><p className="mt-2 text-sm leading-6 text-white/85">{person.intro}</p><div className="mt-4 flex flex-wrap gap-2">{person.tags.map((tag) => <span key={tag} className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold">{tag}</span>)}</div></div></article><p className="animate-pulse py-3 text-center text-xs text-white/45">↑ {t.swipe}</p><div className="grid grid-cols-[1fr_1.45fr] gap-3"><button onClick={nextPerson} className="soft-button rounded-2xl border border-white/15 bg-white/5 py-4 font-bold text-white/80">× {t.skip}</button><button onClick={() => { void requestMatch(); nextPerson(); }} className="soft-button pink-gradient rounded-2xl py-4 font-bold shadow-[0_12px_28px_#ef38b755]">♥ {t.request}</button></div></div>}
        {tab === "community" && <div className="mx-auto max-w-xl space-y-4">
          <div><p className="text-sm font-semibold text-pink-300">Blynk Community</p><h1 className="mt-1 text-2xl font-black">{t.share}</h1></div>
          <div className="blynk-card rounded-3xl p-4">
            <textarea value={postText} onChange={(event) => setPostText(event.target.value)} placeholder={t.thought} className="min-h-24 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
            {postVideo && <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10"><video src={postVideo} className="max-h-72 w-full bg-black object-contain" controls muted playsInline /><button onClick={() => { setPostVideo(""); setPostVideoFile(null); }} className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold">× Quitar</button></div>}
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><label className="cursor-pointer text-sm font-bold text-white/60">▣ {t.addVideo}<input onChange={selectPostVideo} className="hidden" type="file" accept="video/*" /></label><button disabled={uploadingPost} onClick={addPost} className="soft-button pink-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:cursor-wait disabled:opacity-60">{uploadingPost ? (language === "es" ? "Subiendo…" : "Uploading…") : t.publish}</button></div>
          </div>
          {posts.map((post) => <article key={post.id} className="blynk-card rounded-3xl p-5">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-violet-600 font-black">{post.initial}</span><div><p className="font-bold">{post.author}</p><p className="text-xs text-white/45">{post.time} · {t.public}</p></div><button onClick={() => setMenu(menu === post.id ? null : post.id)} className="ml-auto rounded-full p-2 text-white/50 hover:bg-white/10">•••</button></div>
            {menu === post.id && <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/30 p-2 text-xs"><button onClick={() => setPosts((items) => items.map((item) => item.id === post.id ? { ...item, commentsEnabled: !item.commentsEnabled } : item))}>{t.disableComments}</button><button onClick={() => notify(t.report)}>{t.report}</button><button onClick={() => notify(t.block)}>{t.block}</button><button onClick={() => setPosts((items) => items.filter((item) => item.id !== post.id))}>{t.delete}</button></div>}
            {post.text && <p className="mt-4 leading-6 text-white/90">{post.text}</p>}{post.video && <video src={post.video} className="mt-4 w-full rounded-2xl bg-black" controls autoPlay muted loop playsInline />}
            <div className="mt-4 flex gap-5 border-t border-white/10 pt-3 text-sm text-white/55"><button onClick={() => addLike(post.id)}>♡ {post.likes}</button><span>◌ {post.comments.length} {t.comments.toLowerCase()}</span></div>
            {post.commentsEnabled && <div className="mt-3 space-y-2">{post.comments.map((entry, index) => <button onClick={() => notify(`${t.reply} · ${t.copy} · ${t.hide}`)} className="block w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white/75" key={`${entry}-${index}`}>{entry}</button>)}<div className="flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none" placeholder={t.comment} /><button onClick={() => addComment(post.id)} className="rounded-xl bg-white/10 px-3 text-sm font-bold">{t.send}</button></div></div>}
          </article>)}
        </div>}
        {tab === "messages" && (activeMatch && hasReceivedMessage ? <div className="mx-auto flex h-[68dvh] max-w-xl flex-col overflow-hidden rounded-3xl blynk-card"><div className="flex items-center gap-3 border-b border-white/10 p-4"><span className="grid size-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-pink-500 font-bold">{activeMatch.otherAvatarUrl ? <img src={activeMatch.otherAvatarUrl} alt="" className="size-full object-cover" /> : conversationName.slice(0, 1).toUpperCase()}</span><div><p className="font-bold">{conversationName}</p><p className="text-xs text-emerald-300">● match confirmado</p></div><button onClick={() => setActiveMatch(null)} className="ml-auto text-xs text-white/55">Cerrar</button></div><div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">{chat.map((item, index) => <p key={index} className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${item.from === "me" ? "pink-gradient ml-auto" : "bg-white/10"}`}>{item.text}</p>)}</div><form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={language === "es" ? `Mensaje para ${conversationName}…` : `Message ${conversationName}…`} className="min-w-0 flex-1 rounded-full bg-white/5 px-4 py-3 text-sm outline-none" /><button className="pink-gradient rounded-full px-5 font-bold">➤</button></form></div> : inboxMatchIds.length ? <div className="mx-auto max-w-xl space-y-3 py-8"><h2 className="px-1 text-xl font-black">{language === "es" ? "Mensajes nuevos" : "New messages"}</h2>{matchRequests.filter((request) => inboxMatchIds.includes(request.otherId)).map((request) => <button key={request.id} onClick={() => void openConversation(request)} className="blynk-card flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:border-pink-300/40"><span className="grid size-12 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-pink-500 font-bold">{request.otherAvatarUrl ? <img src={request.otherAvatarUrl} alt="" className="size-full object-cover" /> : request.otherName.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><b className="block truncate">{request.otherName}</b><small className="text-pink-200">{language === "es" ? "Te envió un mensaje" : "Sent you a message"}</small></span><span className="text-pink-200">›</span></button>)}</div> : <div className="mx-auto max-w-xl py-20 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-pink-400/10 text-2xl text-pink-200">✉</span><h2 className="mt-5 text-xl font-black">{language === "es" ? "Aún no tienes mensajes" : "No messages yet"}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/55">{language === "es" ? "Las conversaciones aparecerán aquí cuando uno de tus matches te escriba primero." : "Conversations will appear here when one of your matches messages you first."}</p></div>)}
        {tab === "profile" && <div className="mx-auto max-w-xl space-y-4"><section className="blynk-card overflow-hidden rounded-3xl"><div className="h-28 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-violet-700" /><div className="px-5 pb-5"><div className="-mt-12 flex items-end justify-between"><span className="grid size-24 place-items-center rounded-3xl border-4 border-[#151525] bg-gradient-to-br from-amber-300 to-rose-500 text-3xl font-black">L</span><button onClick={() => notify(t.edit)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">✎ {t.edit}</button></div><h1 className="mt-3 text-2xl font-black">Luis Hernandez</h1><p className="text-sm text-white/60">Los Angeles · 26 · Español, English</p><p className="mt-3 text-sm leading-6 text-white/80">Diseñando una vida que se sienta auténtica. Me gustan las conversaciones que empiezan sin presión.</p><div className="mt-4 flex gap-5 text-sm"><span><b>12</b> publicaciones</span><span><b>48</b> matches</span><span><b>1.2k</b> vistas</span></div></div></section><section className="blynk-card rounded-3xl p-5"><div className="flex items-center justify-between"><h2 className="font-black">{t.gallery}</h2><label className="soft-button cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">+ {t.addMedia}<input onChange={uploadMedia} className="hidden" multiple type="file" accept="image/*,video/*" /></label></div><div className="mt-4 grid grid-cols-3 gap-2">{media.map((source) => <div key={source} role="img" aria-label="Contenido del perfil" className="aspect-square rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${source})` }} />)}{media.length === 0 && <p className="col-span-3 rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm text-white/45">{language === "es" ? "Añade hasta 6 fotos o videos para completar tu perfil." : "Add up to 6 photos or videos to complete your profile."}</p>}</div></section><section className="blynk-card rounded-3xl p-5"><div className="flex items-center justify-between"><h2 className="font-black">{t.settings}</h2><select value={privacy} onChange={(event) => setPrivacy(event.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"><option>{t.public}</option><option>{t.private}</option><option>{t.hidden}</option></select></div><button onClick={() => notify(language === "es" ? "Sesión cerrada en este prototipo" : "Signed out in this prototype")} className="mt-4 text-sm font-bold text-rose-300">↪ {t.logOut}</button></section></div>}
      </section>
      <aside className="hidden lg:block"><div className="blynk-card sticky top-24 rounded-3xl p-5"><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Blynk Pro</p><h2 className="mt-2 text-lg font-black">Tu perfil está al 78%</h2><p className="mt-2 text-sm leading-5 text-white/55">Agrega un video de presentación y recibe más conexiones relevantes.</p><button onClick={() => setTab("profile")} className="soft-button mt-4 w-full rounded-xl bg-white/10 py-3 text-sm font-bold">{t.profileReady}</button></div></aside>
    </div>
    <nav className="mobile-safe fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/10 bg-[#0b0b17ef] px-3 py-2 backdrop-blur-xl lg:hidden">{([ ["discover", "▷"], ["community", "◎"], ["messages", "✉"], ["profile", "◌"] ] as [Tab, string][]).map(([key, icon]) => <button key={key} onClick={() => setTab(key)} className={`grid place-items-center gap-1 px-2 py-1 text-[10px] font-bold ${tab === key ? "text-pink-300" : "text-white/45"}`}><span className="text-xl">{icon}</span>{t[key]}</button>)}</nav>
    {toast && <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#171322] shadow-xl lg:bottom-8">{toast}</div>}
    {matchRequests.some((request) => request.incoming && request.status === "pending") && <aside className="fixed bottom-20 right-4 z-40 w-72 rounded-3xl border border-white/15 bg-[#151525f5] p-4 shadow-2xl backdrop-blur-xl sm:bottom-6"><div className="flex items-center justify-between"><p className="text-sm font-black text-pink-300">{language === "es" ? "Solicitudes" : "Requests"}</p><button onClick={() => void loadMatches()} className="text-xs text-white/50">↻</button></div><div className="mt-3 space-y-2">{matchRequests.filter((request) => request.incoming && request.status === "pending").map((request) => <div key={request.id} className="rounded-2xl bg-white/5 p-3"><p className="text-sm font-bold">{request.otherName}</p><p className="mt-1 text-xs text-white/50">{language === "es" ? "Quiere conectar contigo" : "Wants to connect"}</p><div className="mt-3 flex gap-2"><button onClick={() => void respondToMatch(request, "rejected")} className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-bold">×</button><button onClick={() => void respondToMatch(request, "accepted")} className="pink-gradient flex-1 rounded-xl py-2 text-xs font-bold">✓</button></div></div>)}</div></aside>}
    {tab === "profile" && <section className="fixed inset-x-0 bottom-0 top-[57px] z-20 overflow-y-auto bg-[#090914] px-4 pb-32 pt-6 lg:px-6"><div className="mx-auto max-w-xl space-y-4"><article className="blynk-card overflow-hidden rounded-[2rem]"><div className="h-32 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-violet-700" style={myProfile.coverUrl ? { backgroundImage: `linear-gradient(#09091433, #09091455), url(${myProfile.coverUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} /><div className="px-6 pb-6"><div className="-mt-12 flex items-end justify-between"><label className="group relative grid size-24 cursor-pointer place-items-center overflow-hidden rounded-3xl border-4 border-[#151525] bg-gradient-to-br from-amber-300 to-rose-500 text-3xl font-black"><input onChange={uploadAvatar} className="hidden" type="file" accept="image/*" />{myProfile.avatarUrl ? <img src={myProfile.avatarUrl} alt="Foto de perfil" className="size-full object-cover" /> : (myProfile.displayName || "B").slice(0, 1).toUpperCase()}<span className="absolute inset-x-1 bottom-1 rounded-lg bg-black/65 py-1 text-center text-[10px] font-bold opacity-0 transition group-hover:opacity-100">Cambiar</span></label><button onClick={() => setEditingProfile(true)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">✎ {t.edit}</button></div><h1 className="mt-4 text-3xl font-black">{myProfile.displayName || "Cargando…"}</h1><p className="mt-1 text-sm text-pink-300">@{myProfile.username || "sin_usuario"}</p><p className="mt-1 text-sm text-white/55">{myProfile.email}</p><p className="mt-5 text-sm leading-6 text-white/80">{myProfile.bio || (language === "es" ? "Completa tu presentación para conectar mejor." : "Complete your bio to connect better.")}</p></div></article><article className="blynk-card rounded-3xl p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">{t.gallery}</h2><p className="mt-1 text-xs text-white/50">{language === "es" ? "Hasta 6 fotos o videos visibles en tu perfil." : "Up to 6 photos or videos visible on your profile."}</p></div><label className="soft-button cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">+ {t.addMedia}<input onChange={uploadMedia} className="hidden" multiple type="file" accept="image/*,video/*" /></label></div><div className="mt-4 grid grid-cols-3 gap-2">{media.map((source) => <div key={source} className="aspect-square overflow-hidden rounded-xl bg-white/5">{/\.(mp4|webm|mov)(\?|$)/i.test(source) ? <video src={source} className="size-full object-cover" muted playsInline /> : <img src={source} alt="Contenido del perfil" className="size-full object-cover" />}</div>)}{media.length === 0 && <p className="col-span-3 rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm text-white/45">{language === "es" ? "Agrega fotos o videos para que otras personas te conozcan." : "Add photos or videos so others can get to know you."}</p>}</div></article><article className="blynk-card rounded-3xl p-5"><h2 className="font-black">{language === "es" ? "Privacidad y cuenta" : "Privacy and account"}</h2><p className="mt-2 text-sm text-white/55">{language === "es" ? "Tu nombre, usuario, foto y galería se guardan para esta cuenta." : "Your name, username, photo and gallery are saved for this account."}</p><button onClick={() => void signOut()} className="mt-5 text-sm font-bold text-rose-300">↪ {t.logOut}</button></article></div></section>}
    {editingProfile && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={saveProfile} className="blynk-card w-full max-w-md rounded-[2rem] p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{t.edit} {t.profile}</h2><button type="button" onClick={() => setEditingProfile(false)} className="rounded-full p-2 text-white/60">×</button></div><label className="mt-5 block text-sm font-bold">Nombre<input value={myProfile.displayName} onChange={(event) => setMyProfile((profile) => ({ ...profile, displayName: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none" /></label><label className="mt-4 block text-sm font-bold">Usuario<input value={myProfile.username} onChange={(event) => setMyProfile((profile) => ({ ...profile, username: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none" /></label><label className="mt-4 block text-sm font-bold">Biografía<textarea value={myProfile.bio} onChange={(event) => setMyProfile((profile) => ({ ...profile, bio: event.target.value }))} maxLength={500} className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-black/20 p-4 outline-none" /></label><button disabled={savingProfile} className="pink-gradient soft-button mt-5 w-full rounded-xl py-3.5 font-bold disabled:opacity-60">{savingProfile ? "Guardando…" : "Guardar cambios"}</button></form></div>}
    {tab === "profile" && <nav aria-label="Navegación del perfil" className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-xl gap-2 rounded-2xl border border-white/15 bg-[#1b1a2b]/95 p-2 shadow-2xl backdrop-blur lg:bottom-7"><button onClick={() => setTab("discover")} className="flex-1 rounded-xl px-3 py-2 text-xs font-bold text-pink-200 hover:bg-white/10">⌕ {t.discover}</button><button onClick={() => setTab("community")} className="flex-1 rounded-xl px-3 py-2 text-xs font-bold text-pink-200 hover:bg-white/10">◎ {t.community}</button><button onClick={() => setTab("messages")} className="flex-1 rounded-xl px-3 py-2 text-xs font-bold text-pink-200 hover:bg-white/10">✉ {t.messages}</button></nav>}
    {tab === "profile" && <label className="fixed left-4 top-20 z-40 cursor-pointer rounded-full border border-pink-300/30 bg-[#1b1a2b]/95 px-4 py-2 text-xs font-black text-pink-200 shadow-xl backdrop-blur">▧ {language === "es" ? "Foto de fondo" : "Cover photo"}<input onChange={uploadCover} className="hidden" type="file" accept="image/*" /></label>}
    {tab === "profile" && <button onClick={() => setPresentationOpen(true)} className="fixed right-4 top-20 z-40 rounded-full border border-pink-300/30 bg-[#1b1a2b]/95 px-4 py-2 text-xs font-black text-pink-200 shadow-xl backdrop-blur">▶ Video de presentación</button>}
    {presentationOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Video de presentación" className="blynk-card w-full max-w-lg rounded-[2rem] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Tu perfil</p><h2 className="mt-1 text-2xl font-black">Video de presentación</h2><p className="mt-2 text-sm text-white/55">Este video se mostrará a las personas antes de que decidan enviarte una solicitud.</p></div><button onClick={() => setPresentationOpen(false)} className="rounded-full p-2 text-white/60">×</button></div>{presentationVideo && <video src={presentationVideo} className="mt-5 aspect-video w-full rounded-2xl bg-black object-cover" controls muted playsInline />}<label className="mt-5 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-pink-300/40 bg-pink-400/5 px-4 py-5 text-sm font-bold text-pink-100">▣ Elegir video<input onChange={selectPresentationVideo} className="hidden" type="file" accept="video/mp4,video/webm,video/quicktime" /></label><button disabled={!presentationVideoFile || uploadingPresentation} onClick={() => void savePresentationVideo()} className="pink-gradient soft-button mt-4 w-full rounded-2xl py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-50">{uploadingPresentation ? "Subiendo…" : "Publicar como video de presentación"}</button></section></div>}
    {matchRequests.some((request) => request.incoming && request.status === "pending") && <button onClick={() => setReviewingRequest(matchRequests.find((request) => request.incoming && request.status === "pending") || null)} className="fixed left-4 top-20 z-40 rounded-full border border-pink-300/30 bg-[#1b1a2b]/95 px-4 py-2 text-xs font-black text-pink-200 shadow-xl backdrop-blur">♥ Nueva solicitud · Ver perfil</button>}
    {reviewingRequest && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Revisar solicitud de match" className="blynk-card w-full max-w-md overflow-hidden rounded-[2rem]"><div className="relative aspect-[16/10] bg-gradient-to-br from-pink-500/50 via-violet-600/40 to-slate-900">{reviewingRequest.otherVideoUrl ? <video src={reviewingRequest.otherVideoUrl} className="size-full object-cover" controls autoPlay muted loop playsInline /> : <div className="grid size-full place-items-center text-5xl">✦</div>}<button onClick={() => setReviewingRequest(null)} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white">×</button></div><div className="p-6"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-300 to-rose-500 font-black">{reviewingRequest.otherAvatarUrl ? <img src={reviewingRequest.otherAvatarUrl} alt="" className="size-full object-cover" /> : reviewingRequest.otherName.slice(0, 1).toUpperCase()}</span><div><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Solicitud de match</p><h2 className="text-2xl font-black">{reviewingRequest.otherName}</h2></div></div><p className="mt-4 text-sm leading-6 text-white/75">{reviewingRequest.otherBio || "Esta persona aún no ha añadido una biografía."}</p><p className="mt-3 text-xs text-white/45">Revisa su video y perfil antes de decidir.</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => { void respondToMatch(reviewingRequest, "rejected"); setReviewingRequest(null); }} className="soft-button rounded-2xl border border-white/15 bg-white/5 py-3 font-bold">× Rechazar</button><button onClick={() => { void respondToMatch(reviewingRequest, "accepted"); setReviewingRequest(null); }} className="pink-gradient soft-button rounded-2xl py-3 font-bold">♥ Aceptar match</button></div></div></section></div>}
    {viewingProfile && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Perfil" className="blynk-card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[2rem]"><div className="relative aspect-[16/10] bg-gradient-to-br from-pink-500/50 via-violet-600/40 to-slate-900">{viewingProfile.person.video ? <video src={viewingProfile.person.video} className="size-full object-cover" controls autoPlay muted loop playsInline /> : null}<button onClick={() => setViewingProfile(null)} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white">×</button></div><div className="p-6"><div className="flex items-center gap-3"><span className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-300 to-rose-500 text-xl font-black">{viewingProfile.person.avatarUrl ? <img src={viewingProfile.person.avatarUrl} alt="" className="size-full object-cover" /> : viewingProfile.person.name.slice(0, 1).toUpperCase()}</span><div><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Perfil verificado</p><h2 className="text-2xl font-black">{viewingProfile.person.name}, {viewingProfile.person.age}</h2><p className="text-sm text-white/55">{viewingProfile.person.place}</p></div></div><p className="mt-4 text-sm leading-6 text-white/80">{viewingProfile.person.intro}</p>{viewingProfile.media.length > 0 && <div className="mt-5 grid grid-cols-3 gap-2">{viewingProfile.media.map((source) => <div key={source} className="aspect-square overflow-hidden rounded-xl bg-white/5">{/\.(mp4|webm|mov)(\?|$)/i.test(source) ? <video src={source} className="size-full object-cover" muted playsInline /> : <img src={source} alt="Contenido del perfil" className="size-full object-cover" />}</div>)}</div>}<button onClick={() => { void requestMatch(); setViewingProfile(null); }} className="pink-gradient soft-button mt-6 w-full rounded-2xl py-3.5 font-bold">♥ {t.request}</button></div></section></div>}
  </main>;
}
