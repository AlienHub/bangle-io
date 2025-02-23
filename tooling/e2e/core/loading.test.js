const {
  sleep,
  longSleep,
  ctrlKey,
  url,
  createNewNote,
  clearPrimaryEditor,
  getEditorHTML,
  createWorkspace,
  newPage,
  getPrimaryEditorDebugString,
  SELECTOR_TIMEOUT,
} = require('../helpers');

jest.retryTimes(2);

jest.setTimeout(105 * 1000);

let page, destroyPage;
beforeEach(async () => {
  ({ page, destroyPage } = await newPage(browser));
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.evaluate(() => localStorage.clear());
});
afterEach(async () => {
  await destroyPage();
});

test('Title check', async () => {
  await expect(page.title()).resolves.toMatch('getting started.md - bangle.io');
});

test('Activity bar', async () => {
  const handle = await page.$('.activitybar');
  expect(handle).not.toBe(null);
});

test('Main content exists', async () => {
  const handle = await page.$('main');
  expect(handle).not.toBe(null);
});

test('shows file palette', async () => {
  let handle = await page.$('.universal-palette-container');
  expect(handle).toBe(null);

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('p');
  await page.keyboard.up(ctrlKey);
  handle = await page.waitForSelector('.universal-palette-container', {
    timeout: 2 * SELECTOR_TIMEOUT,
  });
  expect(handle).not.toBe(null);
});

test('shows action palette', async () => {
  await page.keyboard.down(ctrlKey);
  await page.keyboard.down('Shift');
  await page.keyboard.press('P');
  await page.keyboard.up('Shift');
  await page.keyboard.up(ctrlKey);

  let handle = await page.waitForSelector('.universal-palette-container', {
    timeout: 2 * SELECTOR_TIMEOUT,
  });
  expect(handle).not.toBe(null);
  expect(
    (
      await page.$$eval('.universal-palette-item', (nodes) =>
        nodes.map((n) => n.getAttribute('data-id')),
      )
    ).includes('action::bangle-io-core-actions:TOGGLE_THEME_ACTION'),
  ).toBe(true);
});

test('create a new page saved in browser', async () => {
  const newFileName = 'new_file';
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, newFileName);

  const editorHandle = await page.waitForSelector('.bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });
  await clearPrimaryEditor(page);

  await editorHandle.type('# Wow', { delay: 3 });
  await editorHandle.press('Enter', { delay: 20 });
  await editorHandle.type('[ ] list', { delay: 3 });
  await sleep();

  expect(await getPrimaryEditorDebugString(editorHandle)).toMatchSnapshot();
});

test('inline action palette convert to bullet list', async () => {
  const newFileName = 'new_file';
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, newFileName);

  const editorHandle = await await page.waitForSelector('.bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });
  const hasOneUnorderedListElement = () =>
    editorHandle.evaluate((node) => node.querySelectorAll('ul').length === 1);

  await clearPrimaryEditor(page);

  expect(await hasOneUnorderedListElement()).toBe(false);

  await editorHandle.type('/bullet list', { delay: 3 });
  await page.keyboard.press('Enter');
  await sleep(30);
  expect(await hasOneUnorderedListElement()).toBe(true);
  await editorHandle.type('I should a bullet list', { delay: 1 });
  expect(await getEditorHTML(editorHandle)).toMatchSnapshot();
});

test('inline action palette convert to heading 3', async () => {
  const newFileName = 'new_file';
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, newFileName);

  const editorHandle = await await page.waitForSelector('.bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });
  const hasOneH3Element = () =>
    editorHandle.evaluate((node) => node.querySelectorAll('h3').length === 1);

  await clearPrimaryEditor(page);

  expect(await hasOneH3Element()).toBe(false);

  await editorHandle.type('/h3', { delay: 10 });
  await sleep();
  await page.keyboard.press('Enter');
  await longSleep();

  expect(await hasOneH3Element()).toBe(true);
  await editorHandle.type('I am a heading', { delay: 1 });
  expect(await getEditorHTML(editorHandle)).toContain('I am a heading');
});
