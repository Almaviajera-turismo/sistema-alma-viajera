// Alma Viajera · "Pegar mensaje de WhatsApp"
// Recibe el texto (y capturas opcionales) de un chat y devuelve los datos ordenados
// del pedido de cotización. Usa la API de Claude; la clave va en el secreto
// ANTHROPIC_API_KEY de Supabase (Edge Functions → Secrets). No guarda nada.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SISTEMA = `Sos el asistente de una agencia de viajes argentina (Alma Viajera Turismo).
Te pasan mensajes de WhatsApp de clientes (a veces reenviados por un vendedor, varios mensajes seguidos,
audios transcriptos o capturas de pantalla). Tu tarea es ordenar el pedido de cotización y cargarlo con la herramienta.

Reglas:
- No inventes nada. Si un dato no aparece, dejalo vacío (o null).
- "cliente": nombre y apellido de quien pide el viaje, si aparece. Si sólo hay nombre, poné sólo el nombre.
- "telefono": sólo si aparece un número en el mensaje.
- "cuando": fechas o período en pocas palabras (ej. "15 al 22 de enero 2027" o "2ª quincena de febrero, 7 noches").
  Interpretá fechas relativas ("el mes que viene", "para las vacaciones de invierno") usando la fecha de hoy.
- "pasajeros_cant": total de personas que viajan, si se puede saber.
- "tipo": "grupal" sólo si pide una de las salidas grupales de la lista (y poné su id en "salida_id"); si no, "individual".
- "precio_cotizado"/"moneda": sólo si en el chat la agencia YA le pasó un precio. Un presupuesto del cliente va en "pedido".
- "pedido": resumen ordenado de lo que pide, en español rioplatense, con viñetas "• " (destino, fechas/flexibilidad,
  cantidad y edades, salida desde, aéreo/bus, hotel/categoría, régimen, presupuesto, excursiones, pedidos especiales).
  Sólo lo que dijo el cliente. Sin saludos ni relleno.
- "faltantes": lo importante que habría que preguntarle para poder cotizar (máximo 5, frases cortas).`;

const HERRAMIENTA = {
  name: "cargar_pedido",
  description: "Carga el pedido de cotización ordenado.",
  input_schema: {
    type: "object",
    properties: {
      cliente: { type: "string" },
      telefono: { type: "string" },
      tipo: { type: "string", enum: ["individual", "grupal"] },
      salida_id: { type: ["string", "null"] },
      destino: { type: "string", description: "Destino o recorrido, corto (ej. 'Maragogi', 'Europa: Madrid, París, Roma')." },
      cuando: { type: "string" },
      pasajeros_cant: { type: ["integer", "null"] },
      precio_cotizado: { type: ["number", "null"] },
      moneda: { type: ["string", "null"], enum: ["USD", "ARS", null] },
      pedido: { type: "string" },
      faltantes: { type: "array", items: { type: "string" } },
    },
    required: ["cliente", "tipo", "destino", "cuando", "pedido", "faltantes"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    // Sólo personal habilitado de la agencia
    const url = Deno.env.get("SUPABASE_URL")!;
    const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const perfil = await fetch(`${url}/rest/v1/perfiles?select=activo`, {
      headers: { apikey, Authorization: req.headers.get("Authorization") || "" },
    });
    const filas = perfil.ok ? await perfil.json() : [];
    if (!filas?.[0]?.activo) return json({ error: "Tu usuario no está habilitado." }, 401);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "Falta configurar la clave de la IA (ANTHROPIC_API_KEY) en Supabase." }, 500);

    const { texto = "", imagenes = [], salidas = [], hoy = "" } = await req.json();
    if (!String(texto).trim() && !imagenes.length) return json({ error: "Pegá el mensaje o adjuntá una captura." }, 400);
    if (String(texto).length > 20000) return json({ error: "El mensaje es demasiado largo (máximo 20.000 caracteres)." }, 400);
    if (imagenes.length > 4) return json({ error: "Adjuntá como máximo 4 capturas." }, 400);

    const lista = (salidas as { id: string; nombre: string; destino: string; salida: string }[])
      .slice(0, 80).map((s) => `- id ${s.id}: ${s.nombre} · ${s.destino} · sale ${s.salida}`).join("\n");
    const content = [
      ...(imagenes as { tipo: string; datos: string }[]).map((i) => ({
        type: "image", source: { type: "base64", media_type: i.tipo, data: i.datos },
      })),
      {
        type: "text",
        text: `Fecha de hoy: ${hoy}\nSalidas grupales de la agencia:\n${lista || "(ninguna)"}\n\n` +
          `Mensaje(s) de WhatsApp:\n"""\n${String(texto).trim() || "(ver las capturas)"}\n"""`,
      },
    ];
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-5-5",
        max_tokens: 1500,
        system: SISTEMA,
        tools: [HERRAMIENTA],
        tool_choice: { type: "tool", name: "cargar_pedido" },
        messages: [{ role: "user", content }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: "La IA no respondió: " + (j?.error?.message || r.status) }, 502);
    const uso = j.content?.find((c: { type: string }) => c.type === "tool_use");
    if (!uso) return json({ error: "No se pudo ordenar el mensaje." }, 502);
    return json({ pedido: uso.input });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
