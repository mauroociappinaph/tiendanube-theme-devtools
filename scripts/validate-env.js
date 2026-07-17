// scripts/validate-env.js
// Minimal env validation - strict in CI, permissive in local dev

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

const required = [
  'CHROME_WEBSTORE_CLIENT_ID',
  'CHROME_WEBSTORE_CLIENT_SECRET',
  'CHROME_WEBSTORE_REFRESH_TOKEN',
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  if (isCI) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    process.exit(1);
  } else {
    console.warn('⚠️  Missing Chrome Web Store credentials (expected in local dev):');
    missing.forEach(key => console.warn(`  - ${key}`));
    console.warn('   Set them for CI/CD or publishing. Continuing...');
  }
} else {
  console.log('✅ All required environment variables present');
}

process.exit(0);