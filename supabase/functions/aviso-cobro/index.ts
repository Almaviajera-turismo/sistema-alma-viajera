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
const OFI: Record<string, string> = { centro: "Centro", gaona: "Gaona" };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const resp = (b: string | object, status = 200) => new Response(typeof b === "string" ? b : JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": typeof b === "string" ? "text/plain; charset=utf-8" : "application/json" } });

async function enviar(subject: string, filas: [string, string][], pie = "") {
  const pass = (Deno.env.get("SMTP_PASS") || "").trim();   // por si se pegó con espacios o salto de línea
  if (!pass) throw new Error("Falta la contraseña de info@ (secreto SMTP_PASS)");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222"><h2 style="color:#3b2f7a;margin:0 0 12px">${esc(subject)}</h2><table style="border-collapse:collapse">${filas.map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#666">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`).join("")}</table>${pie ? `<p style="color:#666;margin-top:14px">${esc(pie)}</p>` : ""}<p style="color:#999;font-size:12px;margin-top:18px">Aviso automático del sistema de gestión de Alma Viajera Turismo.</p></div>`;
  const text = subject + "\n\n" + filas.map(([k, v]) => k + ": " + v).join("\n") + (pie ? "\n\n" + pie : "");
  const client = new SMTPClient({ connection: { hostname: HOST, port: 465, tls: true, auth: { username: DE, password: pass } } });
  try { await client.send({ from: "Alma Viajera Turismo <" + DE + ">", to: PARA, subject, content: text, html }); }
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
