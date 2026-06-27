#!/usr/bin/env node
/**
 * Local `npm start` helper — Railway uses scripts/start.cjs directly.
 */
const { syncNextAuthUrl } = require("./resolve-nextauth-url.cjs");

const port = process.env.PORT || "3000";
console.log(`[prestart] PORT=${port}`);

syncNextAuthUrl("[prestart]");
