import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runTests() {
  console.log('Launching headless Chrome for verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('\n=== TEST /login ===');
  // 1. Open /login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  console.log('1. Navigated to /login');

  // Helper to check errors on page
  const getErrors = async () => {
    return page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"]')).map(el => el.textContent || '');
      const bodyText = document.body.innerText;
      const hasGoogleErr = alerts.some(t => t.includes('Google sign-in is not configured yet')) || bodyText.includes('Google sign-in is not configured yet');
      const hasLinkedInErr = alerts.some(t => t.includes('LinkedIn sign-in is not configured yet')) || bodyText.includes('LinkedIn sign-in is not configured yet');
      return { alerts, hasGoogleErr, hasLinkedInErr };
    });
  };

  // 2 & 3. Confirm NO Google error and NO LinkedIn error appears
  let errors = await getErrors();
  console.log('2. Google error on load:', errors.hasGoogleErr);
  console.log('3. LinkedIn error on load:', errors.hasLinkedInErr);
  if (errors.hasGoogleErr || errors.hasLinkedInErr) {
    throw new Error('FAILED: Initial /login page showed OAuth errors!');
  }
  console.log('PASS: Initial /login has zero OAuth errors.');

  // 4. Click Google
  console.log('4. Clicking "Continue with Google"...');
  const googleBtn = await page.waitForSelector('xpath///button[contains(., "Continue with Google")]');
  await googleBtn.click();
  await new Promise(r => setTimeout(r, 600));

  // 5. Confirm ONLY the Google error appears
  errors = await getErrors();
  console.log('5. After Google click: hasGoogleErr =', errors.hasGoogleErr, ', hasLinkedInErr =', errors.hasLinkedInErr);
  if (!errors.hasGoogleErr || errors.hasLinkedInErr) {
    throw new Error('FAILED: Google click did not show only Google error!');
  }
  console.log('PASS: Only Google error appeared after click.');

  // 6. Refresh
  console.log('6. Refreshing /login...');
  await page.reload({ waitUntil: 'networkidle0' });

  // 7. Confirm the error disappears
  errors = await getErrors();
  console.log('7. After refresh: hasGoogleErr =', errors.hasGoogleErr, ', hasLinkedInErr =', errors.hasLinkedInErr);
  if (errors.hasGoogleErr || errors.hasLinkedInErr) {
    throw new Error('FAILED: OAuth error persisted across refresh on /login!');
  }
  console.log('PASS: Error completely disappeared upon refresh.');

  // 8. Click LinkedIn
  console.log('8. Clicking "Continue with LinkedIn"...');
  const linkedinBtn = await page.waitForSelector('xpath///button[contains(., "Continue with LinkedIn")]');
  await linkedinBtn.click();
  await new Promise(r => setTimeout(r, 600));

  // 9. Confirm only the LinkedIn error appears if unconfigured
  errors = await getErrors();
  console.log('9. After LinkedIn click: hasGoogleErr =', errors.hasGoogleErr, ', hasLinkedInErr =', errors.hasLinkedInErr);
  if (!errors.hasLinkedInErr || errors.hasGoogleErr) {
    throw new Error('FAILED: LinkedIn click did not show only LinkedIn error!');
  }
  console.log('PASS: Only LinkedIn error appeared after click.');

  console.log('\n=== TEST /signup ===');
  // 10. Open /signup
  await page.goto('http://localhost:5173/signup', { waitUntil: 'networkidle0' });
  console.log('10. Navigated to /signup');

  // 11 & 12. Confirm NO Google error appears, NO LinkedIn error appears
  errors = await getErrors();
  console.log('11. Google error on load:', errors.hasGoogleErr);
  console.log('12. LinkedIn error on load:', errors.hasLinkedInErr);
  if (errors.hasGoogleErr || errors.hasLinkedInErr) {
    throw new Error('FAILED: Initial /signup page showed OAuth errors!');
  }
  console.log('PASS: Initial /signup has zero OAuth errors.');

  // 13. Click Google
  console.log('13. Clicking "Continue with Google"...');
  const signupGoogleBtn = await page.waitForSelector('xpath///button[contains(., "Continue with Google")]');
  await signupGoogleBtn.click();
  await new Promise(r => setTimeout(r, 600));

  // 14. Confirm Google-specific error appears only after click
  errors = await getErrors();
  console.log('14. After Google click: hasGoogleErr =', errors.hasGoogleErr, ', hasLinkedInErr =', errors.hasLinkedInErr);
  if (!errors.hasGoogleErr || errors.hasLinkedInErr) {
    throw new Error('FAILED: Google click on /signup did not show only Google error!');
  }
  console.log('PASS: Google-specific error appeared only after click on /signup.');

  // 15. Refresh
  console.log('15. Refreshing /signup...');
  await page.reload({ waitUntil: 'networkidle0' });

  // 16. Confirm it disappears
  errors = await getErrors();
  console.log('16. After refresh: hasGoogleErr =', errors.hasGoogleErr, ', hasLinkedInErr =', errors.hasLinkedInErr);
  if (errors.hasGoogleErr || errors.hasLinkedInErr) {
    throw new Error('FAILED: OAuth error persisted across refresh on /signup!');
  }
  console.log('PASS: Error disappeared upon refresh on /signup.');

  // 17. Click LinkedIn
  console.log('17. Clicking "Continue with LinkedIn"...');
  const signupLinkedInBtn = await page.waitForSelector('xpath///button[contains(., "Continue with LinkedIn")]');
  await signupLinkedInBtn.click();
  await new Promise(r => setTimeout(r, 600));

  // 18. Confirm LinkedIn-specific error appears only after click
  errors = await getErrors();
  console.log('18. After LinkedIn click: hasGoogleErr =', errors.hasGoogleErr, ', hasLinkedInErr =', errors.hasLinkedInErr);
  if (!errors.hasLinkedInErr || errors.hasGoogleErr) {
    throw new Error('FAILED: LinkedIn click on /signup did not show only LinkedIn error!');
  }
  console.log('PASS: LinkedIn-specific error appeared only after click on /signup.');

  console.log('\n=== TEST EMAIL AUTHENTICATION ===');
  // 19. Email/password signup still works
  console.log('19. Testing email/password signup...');
  const randomId = Math.floor(Math.random() * 100000);
  const testEmail = `user_${randomId}@example.com`;
  await page.type('#fullName', 'Test User');
  await page.type('#email', testEmail);
  await page.type('#password', 'TestPassword123');
  await page.type('#confirmPassword', 'TestPassword123');
  const submitSignup = await page.waitForSelector('xpath///button[@type="submit" and contains(., "Create Account")]');
  await submitSignup.click();

  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});
  const currentUrlAfterSignup = page.url();
  console.log('URL after signup:', currentUrlAfterSignup);
  if (!currentUrlAfterSignup.includes('/dashboard')) {
    throw new Error(`FAILED: Email signup did not redirect to /dashboard (current: ${currentUrlAfterSignup})`);
  }
  console.log('PASS: Email/password signup succeeded and redirected to /dashboard.');

  // Clear session to test login
  await page.evaluate(() => localStorage.clear());

  // 20. Email/password login still works
  console.log('20. Testing email/password login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('#email', testEmail);
  await page.type('#password', 'TestPassword123');
  const submitLogin = await page.waitForSelector('xpath///button[@type="submit" and contains(., "Sign In")]');
  await submitLogin.click();

  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});
  const currentUrlAfterLogin = page.url();
  console.log('URL after login:', currentUrlAfterLogin);
  if (!currentUrlAfterLogin.includes('/dashboard')) {
    throw new Error(`FAILED: Email login did not redirect to /dashboard (current: ${currentUrlAfterLogin})`);
  }
  console.log('PASS: Email/password demo login succeeded and redirected to /dashboard.');

  console.log('\n==================================================');
  console.log('ALL 20 TEST CASES PASSED SUCCESSFULLY!');
  console.log('==================================================');

  await browser.close();
}

runTests().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
