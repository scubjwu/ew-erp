// @ts-nocheck
import { Resend } from "npm:resend";
import { createClient } from "npm:@supabase/supabase-js@2";

type DepotInfo = {
  name: string;
  address: string;
  tel: string;
};

type OrderGroup = {
  specs: string;
  condition: string;
  color: string;
  engine: string;
  price: string | number;
  dpp: string | number;
  units: string[];
  gateInRef: string;
};

type SendReleaseEmailPayload = {
  to: string[];
  cc?: string[];
  customerName: string;
  depotInfo: DepotInfo;
  orderGroups: OrderGroup[];
  salesRepName: string;
  replyTo: string;
  subject: string;
};

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-internal-secret, content-type, apikey, x-client-info",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validatePayload(payload: unknown): payload is SendReleaseEmailPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as SendReleaseEmailPayload;

  if (!Array.isArray(p.to) || p.to.length === 0) return false;
  if (!p.to.every((v) => typeof v === "string" && v.trim().length > 0)) return false;
  if (p.cc !== undefined) {
    if (!Array.isArray(p.cc)) return false;
    if (!p.cc.every((v) => typeof v === "string")) return false;
  }
  if (typeof p.customerName !== "string" || !p.customerName.trim()) return false;
  if (!p.depotInfo || typeof p.depotInfo !== "object") return false;
  if (typeof p.depotInfo.name !== "string") return false;
  if (typeof p.depotInfo.address !== "string") return false;
  if (typeof p.depotInfo.tel !== "string") return false;
  if (!Array.isArray(p.orderGroups)) return false;
  if (!p.orderGroups.every((g) => typeof g === "object" && g !== null)) return false;
  if (typeof p.salesRepName !== "string" || !p.salesRepName.trim()) return false;
  if (typeof p.replyTo !== "string") return false;
  if (typeof p.subject !== "string" || !p.subject.trim()) return false;

  return true;
}

async function authorizeRequest(req: Request): Promise<boolean> { 
  return true;
  
  // Internal ops simple auth option.
  const internalSecret = Deno.env.get("INTERNAL_OPS_SECRET");
  const reqSecret = req.headers.get("x-internal-secret");
  if (internalSecret && reqSecret && reqSecret === internalSecret) {
    return true;
  }

  // Supabase auth context validation.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return false;
  return Boolean(data.user);
}

function buildItemsRows(groups: OrderGroup[], hasEngine: boolean): string {
  return groups
    .map((g, index) => {
      const units = g.units?.length
        ? g.units.map((u) => escapeHtml(String(u))).join(", ")
        : "-";
      return `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${index + 1}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(String(g.specs ?? "-"))}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(String(g.condition ?? "-"))}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(String(g.color ?? "-"))}</td>
          ${
            hasEngine
              ? `<td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(
                  String(g.engine ?? "-")
                )}</td>`
              : ""
          }
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${escapeHtml(String(g.price ?? "-"))}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${escapeHtml(String(g.dpp ?? "-"))}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(String(g.gateInRef ?? "-"))}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${units}</td>
        </tr>
      `;
    })
    .join("");
}

function buildHtml(payload: SendReleaseEmailPayload): string {
  const now = new Date().toISOString().slice(0, 10);
  const hasEngine = payload.orderGroups.some(
    (g) =>
      g.engine &&
      String(g.engine).trim().length > 0 &&
      String(g.engine).toLowerCase() !== "unknown" &&
      String(g.engine) !== "-"
  );
  const itemsRows = buildItemsRows(payload.orderGroups, hasEngine);

  return `
  <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
    <h2 style="margin:0 0 12px;">Release Confirmation</h2>
    <p style="margin:0 0 16px;">
      Dear Operations Team,<br />
      Please proceed with container release for <strong>${escapeHtml(payload.customerName)}</strong>.
    </p>

    <h3 style="margin:20px 0 8px;font-size:16px;">Pickup Details</h3>
    <table style="border-collapse:collapse;width:100%;max-width:860px;">
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;width:180px;">Customer</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(payload.customerName)}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Depot Name</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(payload.depotInfo.name || "-")}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Depot Address</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(payload.depotInfo.address || "-")}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Depot Tel</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(payload.depotInfo.tel || "-")}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Sales Rep</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(payload.salesRepName)}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Date</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${now}</td>
      </tr>
    </table>

    <h3 style="margin:20px 0 8px;font-size:16px;">Release Items</h3>
    <table style="border-collapse:collapse;width:100%;max-width:860px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">#</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Specs</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Condition</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Color</th>
          ${
            hasEngine
              ? '<th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Machine Type</th>'
              : ""
          }
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Price</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">DPP</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Gate-in Ref</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Units</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <p style="margin-top:18px;">
      Best regards,<br />
      EW Operations
    </p>
  </div>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authorized = await authorizeRequest(req);
  if (!authorized) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!validatePayload(payload)) {
    return jsonResponse({ error: "Invalid payload format" }, 400);
  }

  const resendApiKey =
    Deno.env.get("resend_api_key") ?? Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return jsonResponse({ error: "Missing resend_api_key" }, 500);
  }

  const safePayload = payload as SendReleaseEmailPayload;
  const resend = new Resend(resendApiKey);

  try {
    const html = buildHtml(safePayload);
    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: safePayload.to,
      cc: safePayload.cc?.length ? safePayload.cc : undefined,
      replyTo: safePayload.replyTo || undefined,
      subject: safePayload.subject,
      html,
    });

    return jsonResponse({
      ok: true,
      message: "Release email sent",
      result,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});
