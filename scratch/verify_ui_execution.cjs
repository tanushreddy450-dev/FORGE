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

    page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // 1. Log in through UI
    console.log('Logging in via UI...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'demo@algomaster.com');
    await page.type('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    console.log('Navigating to /arena/two-sum...');
    await page.goto('http://localhost:5174/arena/two-sum', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 4000));

    async function getConsoleOutput() {
        return await page.evaluate(() => {
            const pres = document.querySelectorAll('pre');
            for (const pre of pres) {
                const text = pre.innerText || '';
                if (text.includes('Status:') || text.includes('Submission:') || text.includes('Executing') || text.includes('Compile Error') || text.includes('Provider:') || text.includes('Tests:')) {
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
        await new Promise((r) => setTimeout(r, 800));
    }

    async function clickRunTests() {
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const runBtn = buttons.find((b) => b.innerText && b.innerText.includes('Run Tests'));
            if (runBtn) runBtn.click();
        });
        await new Promise((r) => setTimeout(r, 4000));
    }

    async function clickSubmit() {
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const subBtn = buttons.find((b) => b.innerText && b.innerText.includes('Submit'));
            if (subBtn) subBtn.click();
        });
        await new Promise((r) => setTimeout(r, 4000));
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
    console.log('\nAll 4 UI tests finished successfully!');
}

run().catch((err) => {
    console.error('Error in UI test runner:', err);
    process.exit(1);
});
