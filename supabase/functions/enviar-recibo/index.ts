// Alma Viajera · envía el recibo de un cobro (PDF adjunto) al pasajero desde info@almaviajeraturismo.com.
// Lo llama el sistema con la sesión del usuario (socio o vendedor activo).
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const DE = "info@almaviajeraturismo.com";
const HOST = Deno.env.get("SMTP_HOST") || "c265.ferozo.com";   // servidor de mail.almaviajeraturismo.com (Ferozo)
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = (() => { try { const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); return j.default || Object.values(j)[0] || ""; } catch { return ""; } })() || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const resp = (b: string | object, status = 200) => new Response(typeof b === "string" ? b : JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": typeof b === "string" ? "text/plain; charset=utf-8" : "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const ur = await fetch(URL_ + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + jwt } });
    const u = ur.ok ? await ur.json() : null;
    if (!u?.id) return resp("Sesión no válida. Volvé a entrar al sistema.", 401);
    const { data: per } = await db.from("perfiles").select("nombre, rol, activo").eq("id", u.id).maybeSingle();
    if (!per?.activo || !["socio", "vendedor"].includes(per.rol)) return resp("No autorizado", 403);

    const b = await req.json().catch(() => ({}));
    const id = String(b.cobro_id || ""), to = String(b.to || "").trim(), pdf = String(b.pdf || "");
    if (!/^[0-9a-f-]{36}$/.test(id)) return resp("Recibo inválido", 400);
    if (!EMAIL.test(to)) return resp("La dirección de email no es válida", 400);
    if (!pdf || pdf.length > 8_000_000) return resp("Falta el PDF del recibo o es demasiado grande", 400);
    const { data: c } = await db.from("cobros").select("id, numero, anulado").eq("id", id).maybeSingle();
    if (!c) return resp("El recibo no existe", 404);
    if (c.anulado) return resp("Este recibo está anulado y no se puede enviar", 409);

    const pass = (Deno.env.get("SMTP_PASS") || "").trim();
    if (!pass) return resp("Falta la contraseña de info@ en el servidor", 500);
    const subject = String(b.subject || ("Alma Viajera Turismo · Recibo " + (c.numero || ""))).slice(0, 200);
    const texto = String(b.body || "").slice(0, 5000);
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.5">${esc(texto).replace(/\n/g, "<br>")}</div>`;
    const client = new SMTPClient({ connection: { hostname: HOST, port: 465, tls: true, auth: { username: DE, password: pass } } });
    try {
      await client.send({ from: "Alma Viajera Turismo <" + DE + ">", to: [to], bcc: [DE], replyTo: DE, subject, content: texto, html,
        attachments: [{ filename: "Recibo " + (c.numero || "Alma Viajera") + ".pdf", content: pdf, encoding: "base64", contentType: "application/pdf" }] });
    } finally { await client.close(); }
    return resp({ ok: true });
  } catch (e) {
    console.error(e);
    return resp("No se pudo enviar: " + String((e as Error).message || e), 500);
  }
});
