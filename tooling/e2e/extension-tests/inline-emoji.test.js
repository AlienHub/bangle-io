const {
  url,
  createNewNote,
  clearPrimaryEditor,
  getEditorHTML,
  createWorkspace,
  sleep,
  longSleep,
  getPrimaryEditorDebugString,
} = require('../helpers');

jest.setTimeout(155 * 1000);

jest.retryTimes(2);

beforeEach(async () => {
  await jestPuppeteer.resetPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.evaluate(() => localStorage.clear());
});

test('Emoji works in heading', async () => {
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'test123');
  await longSleep();

  const editorHandle = await page.$('.bangle-editor');
  await clearPrimaryEditor(page);
  await sleep();
  await editorHandle.type('# Wow :', { delay: 3 });
  await editorHandle.press('ArrowDown');
  await editorHandle.press('Enter');

  const html = await getEditorHTML(editorHandle);

  expect(html.includes('😉')).toBe(true);

  expect(await getPrimaryEditorDebugString(page)).toMatchSnapshot();
});

test('Emoji works in para', async () => {
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'test123');

  const editorHandle = await page.$('.bangle-editor');

  await clearPrimaryEditor(page);

  await editorHandle.type('life is good :zeb', { delay: 1 });
  await editorHandle.press('Enter');
  const html = await getEditorHTML(editorHandle);
  expect(html.includes('🦓')).toBe(true);
  expect(await getEditorHTML(editorHandle)).toMatchSnapshot();
});

test('Emoji works in list', async () => {
  const wsName = await createWorkspace(page);

  await createNewNote(page, wsName, 'test123');

  const editorHandle = await page.$('.bangle-editor');

  await clearPrimaryEditor(page);

  await editorHandle.type('- I am a list :zeb', { delay: 1 });
  await editorHandle.press('Enter');
  const html = await getEditorHTML(editorHandle);
  expect(html.includes('🦓')).toBe(true);
  expect(await getEditorHTML(editorHandle)).toMatchSnapshot();
});
