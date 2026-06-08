const { getDailySummaryAction } = require('./src/app/actions/dashboard');

async function main() {
  // Mock requireAuth to bypass auth check in getDailySummaryAction
  const auth = require('./src/lib/auth');
  auth.requireAuth = async () => ({ id: 'admin-id', name: 'Radhiv Kansara', role: 'admin' });

  const result = await getDailySummaryAction("2026-06-08");
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
