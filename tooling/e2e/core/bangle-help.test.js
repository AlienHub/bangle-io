const { SELECTOR_TIMEOUT, sleep, url, newPage } = require('../helpers');

jest.retryTimes(2);

let page, destroyPage;
beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));

  // await jestPuppeteer.resetPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.evaluate(() => localStorage.clear());
});

afterEach(async () => {
  await destroyPage();
});

test('Landing page is correct', async () => {
  const handle = await page.waitForSelector('.editor-container_editor-0', {
    timeout: SELECTOR_TIMEOUT,
  });
  await sleep(100);

  const result = await handle.evaluate((node) => node.innerText);
  expect(result).toMatchSnapshot();
});
