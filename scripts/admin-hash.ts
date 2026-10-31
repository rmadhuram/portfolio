// Usage: npm run admin:hash -- "your password"   -> prints ADMIN_PASSWORD_HASH value
import { randomBytes, scryptSync } from "node:crypto";
const pw = process.argv[2];
if (!pw || pw.length < 8) { console.error("Provide a password of at least 8 characters."); process.exit(1); }
const salt = randomBytes(16);
console.log(`scrypt:${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`);
