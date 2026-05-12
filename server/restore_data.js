const db = require('better-sqlite3')('../data/skincare.db');

try {
  // Set referral codes
  db.prepare("UPDATE users SET referral_code = 'ADMIN123' WHERE id = 1").run();
  db.prepare("UPDATE users SET referral_code = 'USERXIAOMEI' WHERE id = 2").run();
  db.prepare("UPDATE users SET referral_code = 'USERSNOW' WHERE id = 3").run();
  db.prepare("UPDATE users SET referral_code = 'USERGUIFEI' WHERE id = 4").run();
  db.prepare("UPDATE users SET referral_code = 'USERRUAN' WHERE id = 5").run();

  // Set referred_by
  db.prepare("UPDATE users SET referred_by = 1 WHERE id = 2").run();
  db.prepare("UPDATE users SET referred_by = 2 WHERE id = 3").run();
  db.prepare("UPDATE users SET referred_by = 2 WHERE id = 4").run();
  db.prepare("UPDATE users SET referred_by = 3 WHERE id = 5").run();

  console.log("Mock referral data restored successfully.");
} catch(e) {
  console.error("Error restoring data:", e.message);
}
