import fs from "fs";
import path from "path";
import { setTimeout as delay } from "timers/promises";

import { createClient } from "@supabase/supabase-js";

const DEFAULT_APP_BASE_URL = "http://127.0.0.1:3000";

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function fail(message) {
  throw new Error(message);
}

function formatError(error) {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? ` Cause: ${error.cause.message}` : "";
    return `${error.message}${cause}`;
  }
  return String(error);
}

async function assertHttpOk(url, expectedText = []) {
  let lastFailure = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        lastFailure = `Expected ${url} to return 200, got ${response.status}`;
      } else {
        const body = await response.text();
        if (
          body.includes("Unhandled Runtime Error") ||
          body.includes("Server Error") ||
          body.includes('Error: A "use server" file can only export async functions')
        ) {
          lastFailure = `Runtime error detected in ${url}`;
        } else {
          const missing = expectedText.find((text) => !body.includes(text));
          if (!missing) {
            return;
          }
          lastFailure = `Expected ${url} to include "${missing}"`;
        }
      }
    } catch (error) {
      lastFailure = formatError(error);
    }
    await delay(1000);
  }
  fail(lastFailure ?? `Failed to load ${url}`);
}

async function must(resultPromise, label) {
  const result = await resultPromise;
  if (result.error) {
    result.error.message = `${label}: ${result.error.message}`;
    throw result.error;
  }
  return result.data;
}

async function main() {
  const appBaseUrl = process.env.EW_ERP_BASE_URL || DEFAULT_APP_BASE_URL;
  const env = readEnvFile();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [vendor, materialVendor, containerOwner, lessee, customer] = await Promise.all([
    must(
      supabase.from("vendors").select("id").order("created_at", { ascending: true }).limit(1),
      "load vendor id"
    ).then((rows) => rows?.[0]),
    must(
      supabase.from("material_vendors").select("id").order("created_at", { ascending: true }).limit(1),
      "load material vendor id"
    ).then((rows) => rows?.[0]),
    must(
      supabase.from("container_owners").select("id").order("created_at", { ascending: true }).limit(1),
      "load container owner id"
    ).then((rows) => rows?.[0]),
    must(
      supabase.from("lessees").select("id").order("created_at", { ascending: true }).limit(1),
      "load lessee id"
    ).then((rows) => rows?.[0]),
    must(
      supabase.from("customers").select("id").order("created_at", { ascending: true }).limit(1),
      "load customer id"
    ).then((rows) => rows?.[0]),
  ]);

  if (!vendor?.id || !materialVendor?.id || !containerOwner?.id || !lessee?.id || !customer?.id) {
    fail("Route smoke requires at least one seed row for vendors, material vendors, container owners, lessees, and customers.");
  }

  const routeChecks = [
    [`${appBaseUrl}/`, []],
    [`${appBaseUrl}/basic-info`, []],
    [`${appBaseUrl}/basic-info/regions`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/cities`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/companies`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/condition-codes`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/container-number-rules`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/cost-codes`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/depots`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/operation-prices`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/revenue-codes`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/size-codes`, ["Export CSV"]],
    [`${appBaseUrl}/basic-info/type-codes`, ["Export CSV"]],
    [`${appBaseUrl}/partners/vendors`, ["Export CSV"]],
    [`${appBaseUrl}/partners/vendors/new`, []],
    [`${appBaseUrl}/partners/vendors/${vendor.id}`, ["Vendor Detail"]],
    [`${appBaseUrl}/partners/vendors/${vendor.id}/edit`, []],
    [`${appBaseUrl}/partners/material-vendors`, ["Export CSV"]],
    [`${appBaseUrl}/partners/material-vendors/new`, []],
    [`${appBaseUrl}/partners/material-vendors/${materialVendor.id}`, ["Material Vendor Detail"]],
    [`${appBaseUrl}/partners/material-vendors/${materialVendor.id}/edit`, []],
    [`${appBaseUrl}/partners/container-owners`, ["Export CSV"]],
    [`${appBaseUrl}/partners/container-owners/new`, []],
    [`${appBaseUrl}/partners/container-owners/${containerOwner.id}`, ["Container Owner Detail"]],
    [`${appBaseUrl}/partners/container-owners/${containerOwner.id}/edit`, []],
    [`${appBaseUrl}/partners/lessee`, ["Export CSV"]],
    [`${appBaseUrl}/partners/lessee/new`, []],
    [`${appBaseUrl}/partners/lessee/${lessee.id}`, ["Lessee Detail"]],
    [`${appBaseUrl}/partners/lessee/${lessee.id}/edit`, []],
    [`${appBaseUrl}/partners/customers`, ["Export CSV"]],
    [`${appBaseUrl}/partners/customers/new`, []],
    [`${appBaseUrl}/partners/customers/${customer.id}`, ["Customer Detail"]],
    [`${appBaseUrl}/partners/customers/${customer.id}/edit`, []],
    [`${appBaseUrl}/settings/users`, ["Export CSV"]],
    [`${appBaseUrl}/purchase/po-management`, ["PO Management"]],
  ];

  for (const [url, expectedText] of routeChecks) {
    await assertHttpOk(url, expectedText);
  }

  console.log(
    JSON.stringify(
      {
        routes_checked: routeChecks.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
