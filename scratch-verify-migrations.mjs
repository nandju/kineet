import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Behavioral check: create a throwaway user WITH skip_auto_org and confirm no org gets created.
const probeEmail = `probe-${Date.now()}@example.com`;
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: probeEmail,
  password: crypto.randomUUID(),
  email_confirm: true,
  user_metadata: { skip_auto_org: true },
});
if (createErr) { console.error("createUser error:", createErr.message); process.exit(1); }

await new Promise((r) => setTimeout(r, 800)); // let the trigger run

const { data: orgs } = await admin.from("organizations").select("id").eq("created_by", created.user.id);
console.log("0007 check — orgs auto-created for skip_auto_org user:", orgs?.length ?? "?", orgs?.length === 0 ? "✅ PASS" : "❌ FAIL (still creating an org)");

await admin.auth.admin.deleteUser(created.user.id);

// Check 0006: query policy names on organization_members and recipients via information_schema (readable through PostgREST? usually not exposed).
// Fall back: just confirm the two policy names we expect exist by attempting an operation that would only succeed post-fix isn't easy without two real users.
// Instead, read pg_policies isn't exposed via REST by default. Skipping direct policy introspection.
console.log("0006 (recipients/queue_tasks/distribution_list_recipients + owner protection): cannot introspect policies via REST directly — will confirm via behavioral test with two accounts if needed.");
