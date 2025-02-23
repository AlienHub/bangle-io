const {
  url,
  SELECTOR_TIMEOUT,
  newPage,
  setPageWidescreen,
} = require('../helpers');

jest.setTimeout(105 * 1000);
let page, destroyPage;

beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));
  await setPageWidescreen(page);
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle2' });
});

afterEach(async () => {
  await destroyPage();
});

describe('Options', () => {
  test('lists options', async () => {
    const handle = await page.waitForSelector(
      'button[aria-label="options menu"]',
      {
        timeout: SELECTOR_TIMEOUT,
      },
    );

    await handle.click();

    let optionsHandle = await page.$('[aria-label^="options dropdown"]');
    expect(Boolean(optionsHandle)).toBe(true);

    expect(
      [
        ...(await page.$$eval(
          '[aria-label="options dropdown"] li[data-key]',
          (nodes) => nodes.map((n) => n.innerText),
        )),
      ]
        // to consistify with mac and linux
        .map((r) => r.split('⌘').join('Ctrl')),
    ).toMatchInlineSnapshot(`
      Array [
        "New note",
        "New workspace",
        "Switch workspace
      CtrlR",
        "Toggle dark theme",
        "Notes palette
      CtrlP",
        "Action palette
      Ctrl⇧P",
        "Report issue",
        "Twitter",
        "Discord",
      ]
    `);
  });

  test('clicking on new workspace', async () => {
    const handle = await page.waitForSelector(
      'button[aria-label="options menu"]',
      {
        timeout: SELECTOR_TIMEOUT,
      },
    );

    await handle.click();

    await page.click(
      '[aria-label="options dropdown"] li[data-key="NewWorkspace"]',
    );

    await page.waitForSelector('.ui-components_modal-container', {
      timeout: SELECTOR_TIMEOUT,
    });
    expect(Boolean(await page.$('[aria-label="select storage type"]'))).toBe(
      true,
    );
  });
});
