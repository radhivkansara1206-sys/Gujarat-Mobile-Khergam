import { optimizeAndReport } from '../src/lib/optimizer';

async function run() {
  console.log('--- STARTING HOURLY/DAILY AUTOMATED SCANNERS ---');
  const result = await optimizeAndReport('automatic');
  console.log('--- CLEANUP AND OPTIMIZATION RESULTS ---');
  console.log(JSON.stringify(result, null, 2));
  console.log('----------------------------------------');
}

run().catch((err) => {
  console.error('Automated scheduler ran into an unhandled exception:', err);
  process.exit(1);
});

