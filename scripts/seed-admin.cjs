#!/usr/bin/env node
/**
 * Promotes a user to platform admin.
 * Usage:
 *   node scripts/seed-admin.cjs admin@driftpayment.io
 *   node scripts/seed-admin.cjs admin@driftpayment.io --soft
 *   ADMIN_EMAIL=admin@driftpayment.io node scripts/seed-admin.cjs
 */
const { neon } = require("@neondatabase/serverless");

const DEFAULT_ADMIN_EMAIL = "admin@driftpayment.io";
const soft = process.argv.includes("--soft");
const emailArg = process.argv.find((a) => a.includes("@"));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[seed-admin] DATABASE_URL is not set — skipping");
    if (!soft) process.exit(1);
    return;
  }

  const targetEmail = (emailArg || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase().trim();

  const sql = neon(url);

  let user;

  if (targetEmail) {
    const rows = await sql`
      SELECT id, email, business_name, is_admin
      FROM users
      WHERE lower(email) = ${targetEmail}
      LIMIT 1
    `;
    if (rows.length === 0) {
      const msg = `[seed-admin] No user found with email: ${targetEmail}`;
      if (soft) {
        console.warn(msg + " — skipping");
        return;
      }
      console.error(msg);
      process.exit(1);
    }
    user = rows[0];
  } else {
    const rows = await sql`
      SELECT id, email, business_name, is_admin
      FROM users
      ORDER BY created_at ASC
      LIMIT 1
    `;
    if (rows.length === 0) {
      const msg = "[seed-admin] No users found — register an account first";
      if (soft) {
        console.warn(msg + " — skipping");
        return;
      }
      console.error(msg);
      process.exit(1);
    }
    user = rows[0];
  }

  if (user.is_admin) {
    console.log(`[seed-admin] ${user.email} is already an admin`);
    return;
  }

  await sql`
    UPDATE users
    SET is_admin = true
    WHERE id = ${user.id}
  `;

  console.log(`[seed-admin] Promoted ${user.email} (${user.business_name}) to admin`);
}

main().catch((err) => {
  console.error("[seed-admin] Failed:", err.message || err);
  if (soft) {
    console.warn("[seed-admin] Continuing anyway (--soft mode)");
    process.exit(0);
  }
  process.exit(1);
});

