const db = require('better-sqlite3')('../data/database.sqlite');
try {
  const users = db.prepare("SELECT id, name, referral_code, referred_by FROM users LIMIT 5").all();
  console.log(users);
} catch(e) {
  console.error(e.message);
}
