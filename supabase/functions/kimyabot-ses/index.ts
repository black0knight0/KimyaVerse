// KimyaVerse natural Turkish speech; deploy as an authenticated Supabase Edge Function.
// Required secret: OPENAI_API_KEY (never expose it in the browser).
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigin = "https://black0knight0.github.io";
const cors = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const limits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;
const MAX_TEXT = 2500;

function reply(message: string, code: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: code, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply("Yalnızca POST kullanılabilir.", 405);
  if (req.headers.get("Origin") !== allowedOrigin) return reply("Kaynak izni yok.", 403);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply("Giriş gerekli.", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !anonKey || !openaiKey) return reply("Ses servisi henüz yapılandırılmadı.", 503);

  // Verify the authenticated user's JWT before making a billed audio request.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return reply("Oturum doğrulanamadı.", 401);

  const now = Date.now();
  const times = (limits.get(data.user.id) || []).filter(t => now - t < WINDOW_MS);
  if (times.length >= MAX_REQUESTS) return reply("Ses sınırına ulaşıldı. Bir dakika sonra dene.", 429);
  times.push(now);
  limits.set(data.user.id, times);
  // This in-memory limit applies per warm instance; use persistent rate limits and spend caps in production.
  if (limits.size > 5000) limits.clear();

  let text = "";
  try {
    const body = await req.json();
    if (typeof body?.text !== "string") return reply("Geçerli metin gönder.", 400);
    text = body.text.trim();
  } catch {
    return reply("Geçersiz istek.", 400);
  }
  if (!text || text.length > MAX_TEXT) return reply("Seslendirilecek metin 1–2500 karakter olmalıdır.", 400);

  try {
    const result = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "marin",
        input: text,
        response_format: "mp3",
        instructions: "Konuşma dilin Türkçe. Sıcak, genç, doğal bir öğretmen gibi konuş. Türkçe sözcükleri ve bilim terimlerini doğru telaffuz et. Akıcı, rahat tempolu, arkadaşça ama anlaşılır ol. Uzun monoton duraksamalar yapma."
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!result.ok) {
      console.error("kimyabot-ses: OpenAI speech upstream", result.status);
      return reply("Doğal ses şu anda kullanılamıyor.", 502);
    }
    const sound = await result.arrayBuffer();
    if (!sound.byteLength || sound.byteLength > 10_000_000) return reply("Ses verisi beklenen boyutta değil.", 502);
    return new Response(sound, {
      status: 200,
      headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    console.error("kimyabot-ses: upstream request failed");
    return reply("Doğal ses servisine erişilemedi.", 503);
  }
});
