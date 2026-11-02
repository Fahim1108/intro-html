'use strict';

const config = require('./config');
const admins = require('./repositories/admins');

function seedAdminFromEnvironment() {
  const count = admins.countAdmins();
  if (count > 0) return { created: false };
  if (!config.isConfiguredForAdmin) {
    console.warn('[admin] No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD, then restart.');
    return { created: false };
  }
  if (config.adminPassword.length < 10) {
    console.warn('[admin] ADMIN_PASSWORD must be at least 10 characters. No admin was created.');
    return { created: false };
  }
  admins.createAdmin(config.adminEmail, config.adminPassword);
  console.log(`[admin] Created admin account for ${config.adminEmail}. Change the password after login.`);
  return { created: true };
}

module.exports = { seedAdminFromEnvironment };
