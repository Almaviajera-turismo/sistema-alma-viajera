// Alma Viajera · mail diario (08:00) a cada socio/vendedor con sus tareas de hoy y las vencidas.
// Lo llama la tarea programada «agenda-diaria»; un solo envío por día. Con {prueba:true} y sesión, se lo manda solo a quien lo pide.
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const DE = "info@almaviajeraturismo.com";
const HOST = Deno.env.get("SMTP_HOST") || "c265.ferozo.com";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = (() => { try { const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); return j.default || Object.values(j)[0] || ""; } catch { return ""; } })() || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const resp = (b: string | object, status = 200) => new Response(typeof b === "string" ? b : JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": typeof b === "string" ? "text/plain; charset=utf-8" : "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const asunto = (s: string) => {
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const enc = new TextEncoder(), partes: string[] = []; let buf = "";
  for (const ch of s) { if (enc.encode(buf + ch).length > 42) { partes.push(buf); buf = ""; } buf += ch; }
  if (buf) partes.push(buf);
  return partes.map((p) => "=?UTF-8?B?" + btoa(String.fromCharCode(...enc.encode(p))) + "?=").join(" ");
};
const hoyAR = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const fmt = (d: string) => d ? d.split("-").reverse().join("/") : "";
type T = { titulo: string; fecha: string; hora?: string; prioridad: string; creada_por: string; vinculo?: string; notas?: string };

function armar(nombre: string, ts: T[]) {
  const hoy = hoyAR(), venc = ts.filter((t) => t.fecha < hoy), deHoy = ts.filter((t) => t.fecha === hoy);
  const fila = (t: T) => `<tr><td style="padding:8px 14px;border-top:1px solid #eee;vertical-align:top;color:${t.fecha < hoy ? "#b13c1c" : "#3b2f7a"};white-space:nowrap">${t.fecha < hoy ? "Vencida " + fmt(t.fecha) : (t.hora ? esc(t.hora) : "Hoy")}</td><td style="padding:8px 14px 8px 0;border-top:1px solid #eee">${t.prioridad === "urgente" ? "🔴 " : ""}<b>${esc(t.titulo)}</b>${t.vinculo ? `<br><span style="color:#6b6480;font-size:12px">${esc(t.vinculo)}</span>` : ""}${t.notas ? `<br><span style="color:#555;font-size:12px">${esc(t.notas)}</span>` : ""}${t.creada_por && t.creada_por !== nombre ? `<br><span style="color:#999;font-size:12px">Te la asignó ${esc(t.creada_por)}</span>` : ""}</td></tr>`;
  const titulo = `📋 Tu agenda de hoy · ${deHoy.length} tarea${deHoy.length === 1 ? "" : "s"}${venc.length ? ` · ${venc.length} vencida${venc.length === 1 ? "" : "s"}` : ""}`;
  const html = `<div style="background:#f4f1fa;padding:18px 10px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4def2">
<div style="background:#3b2f7a;color:#fff;padding:14px 18px;font-size:16px;font-weight:bold">${esc(titulo)}</div>
<p style="margin:0;padding:12px 18px 4px;font-size:14px;color:#222">Hola ${esc(nombre.split(" ")[0])}, estas son tus tareas pendientes:</p>
<table style="border-collapse:collapse;width:100%;font-size:14px;color:#222">${[...venc, ...deHoy].map(fila).join("")}</table>
<p style="color:#999;font-size:11px;margin:0;padding:12px 18px 14px">Marcalas como hechas en el sistema → 📋 Mi agenda. Aviso automático de Alma Viajera Turismo.</p></div></div>`;
  const text = titulo + "\n\n" + [...venc, ...deHoy].map((t) => (t.fecha < hoy ? "[Vencida " + fmt(t.fecha) + "] " : t.hora ? "[" + t.hora + "] " : "") + t.titulo).join("\n");
  return { titulo, html, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const pass = (Deno.env.get("SMTP_PASS") || "").trim();
    if (!pass) return resp("Falta la contraseña de info@", 500);
    const { data, error } = await db.rpc("agenda_del_dia");
    if (error) throw error;
    let lista = (data || []) as { nombre: string; email: string; tareas: T[] }[];
    if (body.prueba) {
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const ur = await fetch(URL_ + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + jwt } });
      const u = ur.ok ? await ur.json() : null;
      if (!u?.id) return resp("Sesión no válida", 401);
      lista = lista.filter((x) => x.email === u.email);
      if (!lista.length) return resp({ ok: true, enviados: 0, nada: true });
    } else {
      const { error: dup } = await db.from("agenda_envios").insert({ dia: hoyAR() });
      if (dup) return resp("ya enviado hoy", 200);
    }
    const client = new SMTPClient({ connection: { hostname: HOST, port: 465, tls: true, auth: { username: DE, password: pass } } });
    let n = 0;
    try {
      for (const x of lista) {
        if (!x.email || !x.tareas?.length) continue;
        const m = armar(x.nombre, x.tareas);
        await client.send({ from: "Alma Viajera Turismo <" + DE + ">", to: [x.email], subject: asunto(m.titulo), content: m.text, html: m.html });
        n++;
      }
    } finally { await client.close(); }
    return resp({ ok: true, enviados: n });
  } catch (e) {
    console.error(e);
    return resp(String((e as Error).message || e), 500);
  }
});
