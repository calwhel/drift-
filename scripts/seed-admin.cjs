#!/usr/bin/env node
/**
 * Promotes the first registered user to platform admin.
 * Usage: node scripts/seed-admin.cjs
 */
const { neon } = require("@neondatabase/serverless");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[seed-admin] DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(url);

  const users = await sql`
    SELECT id, email, business_name, is_admin
    FROM users
    ORDER BY created_at ASC
    LIMIT 1
  `;

  if (users.length === 0) {
    console.error("[seed-admin] No users found — register an account first");
    process.exit(1);
  }

  const user = users[0];

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
  process.exit(1);
});
