const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Get auth token from backend and inject into localStorage
    console.log('Logging in via API...');
    const loginRes = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@algomaster.com', password: 'Demo@1234' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.access_token;
    console.log('Auth token acquired.');

    await page.goto('http://localhost:5173/problems/two-sum', { waitUntil: 'networkidle0' });
    await page.evaluate((tok) => {
        localStorage.setItem('algomaster_token', tok);
    }, token);
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 2000));

    async function getConsoleOutput() {
        return await page.evaluate(() => {
            const pres = document.querySelectorAll('pre');
            for (const pre of pres) {
                const text = pre.innerText || '';
                if (text.includes('Status:') || text.includes('Submission:') || text.includes('Executing') || text.includes('Compile Error') || text.includes('Provider:')) {
                    return text;
                }
            }
            return null;
        });
    }

    async function setEditorCode(newCode) {
        await page.evaluate((c) => {
            if (window.monaco && window.monaco.editor) {
                const models = window.monaco.editor.getModels();
                if (models.length > 0) {
                    models[0].setValue(c);
                }
            }
        }, newCode);
        await new Promise((r) => setTimeout(r, 500));
    }

    async function clickRunTests() {
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const runBtn = buttons.find((b) => b.innerText && b.innerText.includes('Run Tests'));
            if (runBtn) runBtn.click();
        });
        // wait for execution
        await new Promise((r) => setTimeout(r, 3000));
    }

    async function clickSubmit() {
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const subBtn = buttons.find((b) => b.innerText && b.innerText.includes('Submit'));
            if (subBtn) subBtn.click();
        });
        // wait for submission
        await new Promise((r) => setTimeout(r, 3000));
    }

    const artifactDir = 'C:\\Users\\tanus\\.gemini\\antigravity-ide\\brain\\ecdb3521-81d4-4c63-86cc-820934edeb21';

    // -------------------------------------------------------------
    // Test A: Incomplete starter code
    // -------------------------------------------------------------
    console.log('\n>>> Running Test A (Incomplete Starter Code)...');
    await clickRunTests();
    let outA = await getConsoleOutput();
    console.log('Test A Run Output:\n', outA);
    await page.screenshot({ path: path.join(artifactDir, 'test_a_incomplete_run.png') });

    await clickSubmit();
    let outASubmit = await getConsoleOutput();
    console.log('Test A Submit Output:\n', outASubmit);
    await page.screenshot({ path: path.join(artifactDir, 'test_a_incomplete_submit.png') });

    // -------------------------------------------------------------
    // Test B: Deliberate Syntax Error
    // -------------------------------------------------------------
    console.log('\n>>> Running Test B (Syntax Error)...');
    const syntaxErrorCode = `function twoSum(nums: number[], target: number) {
    this is invalid syntax
}`;
    await setEditorCode(syntaxErrorCode);
    await clickRunTests();
    let outB = await getConsoleOutput();
    console.log('Test B Output:\n', outB);
    await page.screenshot({ path: path.join(artifactDir, 'test_b_syntax_error.png') });

    // -------------------------------------------------------------
    // Test C: Wrong Logic (return [])
    // -------------------------------------------------------------
    console.log('\n>>> Running Test C (Wrong Logic)...');
    const wrongLogicCode = `function twoSum(nums: number[], target: number): number[] {
    return [];
}`;
    await setEditorCode(wrongLogicCode);
    await clickRunTests();
    let outC = await getConsoleOutput();
    console.log('Test C Output:\n', outC);
    await page.screenshot({ path: path.join(artifactDir, 'test_c_wrong_logic.png') });

    // -------------------------------------------------------------
    // Test D: Correct Two Sum Code
    // -------------------------------------------------------------
    console.log('\n>>> Running Test D (Correct Code)...');
    const correctCode = `function twoSum(nums: number[], target: number): number[] {
    const map = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) {
            return [map.get(diff)!, i];
        }
        map.set(nums[i], i);
    }
    return [];
}`;
    await setEditorCode(correctCode);
    await clickRunTests();
    let outD = await getConsoleOutput();
    console.log('Test D Run Output:\n', outD);
    await page.screenshot({ path: path.join(artifactDir, 'test_d_correct_run.png') });

    await clickSubmit();
    let outDSubmit = await getConsoleOutput();
    console.log('Test D Submit Output:\n', outDSubmit);
    await page.screenshot({ path: path.join(artifactDir, 'test_d_correct_submit.png') });

    await browser.close();
    console.log('\nAll 4 UI tests finished!');
}

run().catch((err) => {
    console.error('Error in UI test runner:', err);
    process.exit(1);
});
