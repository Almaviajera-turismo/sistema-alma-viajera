// Alma Viajera · aviso por mail a los socios cuando se registra (o anula) un cobro.
// Lo llama la base de datos (trigger en «cobros» vía pg_net). Sale desde info@almaviajeraturismo.com.
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const DE = "info@almaviajeraturismo.com";
const PARA = ["hernan@almaviajeraturismo.com", "diego@almaviajeraturismo.com", "adriel@almaviajeraturismo.com", "sandro@almaviajeraturismo.com"];
// mail.almaviajeraturismo.com está en el servidor c265 de Ferozo (DonWeb); su certificado es *.ferozo.com
const HOST = Deno.env.get("SMTP_HOST") || "c265.ferozo.com";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = (() => { try { const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); return j.default || Object.values(j)[0] || ""; } catch { return ""; } })() || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const money = (n: number, c: string) => (c || "USD") + " " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (d: string) => d ? d.slice(0, 10).split("-").reverse().join("/") : "—";
const hora = (t: string) => t ? new Date(t).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const OFI: Record<string, string> = { centro: "Centro", gaona: "Gaona", policlinico: "Gaona" };
// Asunto codificado a mano (RFC 2047, base64 en trozos de caracteres completos): denomailer
// parte mal los asuntos largos con tildes/emojis y el mail llega con los encabezados «sucios».
const asunto = (s: string) => {
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const enc = new TextEncoder(), partes: string[] = []; let buf = "";
  for (const ch of s) { if (enc.encode(buf + ch).length > 42) { partes.push(buf); buf = ""; } buf += ch; }
  if (buf) partes.push(buf);
  return partes.map((p) => "=?UTF-8?B?" + btoa(String.fromCharCode(...enc.encode(p))) + "?=").join(" ");
};

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const resp = (b: string | object, status = 200) => new Response(typeof b === "string" ? b : JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": typeof b === "string" ? "text/plain; charset=utf-8" : "application/json" } });

async function enviar(subject: string, filas: [string, string][], pie = "") {
  const pass = (Deno.env.get("SMTP_PASS") || "").trim();   // por si se pegó con espacios o salto de línea
  if (!pass) throw new Error("Falta la contraseña de info@ (secreto SMTP_PASS)");
  const html = `<div style="background:#f4f1fa;padding:18px 10px;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4def2">
<div style="background:#3b2f7a;color:#ffffff;padding:14px 18px;font-size:16px;font-weight:bold">${esc(subject)}</div>
<table style="border-collapse:collapse;width:100%;font-size:14px;color:#222">${filas.map(([k, v], i) => `<tr style="background:${i % 2 ? "#faf8fd" : "#ffffff"}"><td style="padding:9px 18px;color:#6b6480;width:120px;vertical-align:top">${esc(k)}</td><td style="padding:9px 18px 9px 0;font-weight:bold">${esc(v)}</td></tr>`).join("")}</table>
${pie ? `<p style="color:#555;margin:0;padding:12px 18px;font-size:13px;border-top:1px solid #eee">${esc(pie)}</p>` : ""}
<p style="color:#999;font-size:11px;margin:0;padding:10px 18px 14px">Aviso automático del sistema de gestión de Alma Viajera Turismo.</p></div></div>`;
  const text = subject + "\n\n" + filas.map(([k, v]) => k + ": " + v).join("\n") + (pie ? "\n\n" + pie : "");
  const client = new SMTPClient({ connection: { hostname: HOST, port: 465, tls: true, auth: { username: DE, password: pass } } });
  try { await client.send({ from: "Alma Viajera Turismo <" + DE + ">", to: PARA, subject: asunto(subject), content: text, html }); }
  finally { await client.close(); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.prueba) {
      // prueba manual: solo si la pide alguien con sesión de socio
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const ur = await fetch(URL_ + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + jwt } });
      const u = ur.ok ? await ur.json() : null;
      if (!u?.id) return resp("no autorizado (sesión no válida: " + ur.status + ")", 401);
      const { data: p, error: pe } = await db.from("perfiles").select("rol").eq("id", u.id).maybeSingle();
      if (p?.rol !== "socio") return resp("no autorizado" + (pe ? " (" + pe.message + ")" : ""), 401);
      await enviar("✅ Prueba de avisos de cobro", [["Estado", "El envío desde info@ funciona"], ["Enviado", hora(new Date().toISOString())]]);
      return resp({ ok: true });
    }
    const id = String(body.id || ""), tipo = body.tipo === "anulado" ? "anulado" : "nuevo";
    if (!/^[0-9a-f-]{36}$/.test(id)) return resp("id inválido", 400);
    const { data: c } = await db.from("cobros").select("*").eq("id", id).maybeSingle();
    if (!c) return resp("no existe", 404);
    const ref = tipo === "anulado" ? c.anulado : c.registrado;
    if (!ref || Date.now() - new Date(ref).getTime() > 15 * 60 * 1000) return resp("viejo", 409);
    // un solo aviso por cobro y por tipo
    const { error: dup } = await db.from("avisos_cobro").insert({ cobro_id: id, tipo });
    if (dup) return resp("ya avisado", 200);
    const f = c.foto || {}, x = c.extra || {}, mon = c.moneda || f.currency || "USD";
    const destino = x.destination ? (x.destination === "Otro" ? (x.destinationDetail || "Otro") : x.destination) : "";
    const filas: [string, string][] = [
      ["Recibo", (c.numero || "—") + " · " + hora(c.registrado)],
      ["Pasajero", (f.client || "—") + (x.forPassengerName && x.forPassengerName !== f.client ? " (paga por " + x.forPassengerName + ")" : "")],
      ["File", (f.fileNumber || "—") + (f.trip ? " · " + f.trip : "")],
      ["Importe", money(c.importe, mon) + (c.concepto ? " · " + c.concepto : "")],
      ["Medio", (c.medio || "—") + (destino ? " → " + destino : "") + (x.creditedDate && c.medio !== "Efectivo" ? " (acreditado " + fecha(x.creditedDate) + ")" : "")],
      ["Registró", (c.registrado_por || "—") + " · Oficina " + (OFI[c.caja] || c.caja || "—")],
    ];
    if (f.balanceAfter != null) filas.push(["Saldo del file", money(f.balanceAfter, f.currency || mon)]);
    try {
    if (tipo === "anulado") {
      filas.push(["Anuló", (c.anulado_por || "—") + " · " + hora(c.anulado)], ["Motivo", c.motivo_anulacion || "—"]);
      await enviar("⚠️ Cobro ANULADO · " + (c.numero || "") + " · " + money(c.importe, mon) + " · " + (f.client || ""), filas);
    } else {
      await enviar("💰 Nuevo cobro · " + (c.numero || "") + " · " + money(c.importe, mon) + " · " + (f.client || ""), filas, c.notas ? "Notas: " + c.notas : "");
    }
    } catch (e) { await db.from("avisos_cobro").delete().eq("cobro_id", id).eq("tipo", tipo); throw e; }
    return resp({ ok: true });
  } catch (e) {
    console.error(e);
    return resp(String((e as Error).message || e), 500);
  }
});
