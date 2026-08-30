import { DreaminaService } from './services/dreaminaService';
import { dreaminaTasks } from './db/schema';

async function runTests() {
  console.log('--- STARTING DREAMINA CLI INTEGRATION TESTS ---');

  // Test 1: Verify schema import and Drizzle types compile successfully
  console.log('Test 1: Verifying Drizzle schema compilation...');
  if (dreaminaTasks && dreaminaTasks.submitId) {
    console.log('✅ Success: Drizzle schema compiled and imported successfully!');
  } else {
    console.error('❌ Fail: dreaminaTasks schema is undefined or missing properties.');
    process.exit(1);
  }

  // Test 2: Verify CLI Child Process Execution
  console.log('\nTest 2: Verifying dreamina.exe process execution...');
  try {
    const status = await DreaminaService.checkLoginStatus();
    console.log('✅ Success: dreamina.exe executed successfully!');
    console.log('Login Status:', status.loggedIn ? 'Logged In' : 'Not Logged In');
    if (status.loggedIn) {
      console.log('Account Credit:', status.credit);
    }
  } catch (err: any) {
    console.error('❌ Fail: Failed to execute dreamina.exe process:', err.message);
    process.exit(1);
  }

  console.log('\n--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
