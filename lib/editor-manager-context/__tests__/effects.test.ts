import { ApplicationStore, AppState } from '@bangle.io/create-store';
import type { JsonObject, JsonPrimitive } from '@bangle.io/shared-types';
import { createEditorFromMd } from '@bangle.io/test-utils/create-editor-view';
import { getScrollParentElement } from '@bangle.io/utils';

import { FOCUS_EDITOR_ON_LOAD_COOLDOWN } from '../constants';
import {
  editorManagerSlice,
  JSON_SCHEMA_VERSION,
} from '../editor-manager-slice';
import {
  createTestEditor,
  getActionsDispatched,
  getDispatchedAction,
} from './test-utils';

const getScrollParentElementMock =
  getScrollParentElement as jest.MockedFunction<typeof getScrollParentElement>;

jest.mock('@bangle.io/utils', () => {
  const actual = jest.requireActual('@bangle.io/utils');
  return {
    ...actual,
    getScrollParentElement: jest.fn(),
    debounceFn: jest.fn((cb) => {
      const foo = () => {
        cb();
      };
      foo.cancel = () => {};
      return foo;
    }),
  };
});

beforeEach(() => {
  getScrollParentElementMock.mockImplementation(() => undefined);
});

const createStore = (jsonData?: {
  focusedEditorId?: JsonPrimitive;
  editors?: JsonObject;
  editorConfig?: JsonObject;
}) => {
  const store = ApplicationStore.create({
    scheduler: (cb) => {
      cb();
      return () => {};
    },
    storeName: 'editor-store',
    state: jsonData
      ? AppState.stateFromJSON({
          slices: [editorManagerSlice()],
          json: {
            editorManagerSlice: {
              version: JSON_SCHEMA_VERSION,
              data: jsonData,
            },
          },
          sliceFields: { editorManagerSlice: editorManagerSlice() },
        })
      : AppState.create({ slices: [editorManagerSlice()] }),
  });

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  return { store, dispatchSpy };
};

describe('focusEditorEffect', () => {
  const dateNow = Date.now;

  beforeEach(() => {
    (Date.now as jest.Mock<any>) = jest.fn(() => 1000);
  });

  afterEach(() => {
    Date.now = dateNow;
  });

  test('focuses on a newly opened editor after cooldown', () => {
    let editor1 = createTestEditor('test:first.md');
    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const { store } = createStore();

    // advance the clock
    (Date.now as jest.Mock<any>).mockImplementation(
      () => FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editor1,
        editorId: 0,
      },
    });

    expect(focusSpy1).toBeCalledTimes(1);

    // advance the clock
    (Date.now as jest.Mock<any>).mockImplementation(
      () => 2 * FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    // try setting another editor at a different editorId
    let editor2 = createTestEditor();
    const focusSpy2 = jest.spyOn(editor2, 'focusView');
    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editor2,
        editorId: 1,
      },
    });

    expect(focusSpy2).toBeCalledTimes(1);
  });

  test('default focus is on the first editor on mount', () => {
    let editor1 = createTestEditor('test:first.md');
    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const { store } = createStore();

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editor1,
        editorId: 0,
      },
    });

    expect(focusSpy1).toBeCalledTimes(1);
  });

  test('does not focus on secondary editor on mount', () => {
    let editor1 = createTestEditor();
    let editor2 = createTestEditor();
    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const focusSpy2 = jest.spyOn(editor2, 'focusView');
    const { store } = createStore();

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editor1,
        editorId: 1,
      },
    });

    expect(focusSpy1).toBeCalledTimes(0);

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editor2,
        editorId: 0,
      },
    });

    // focuses on the first as it is the default
    expect(focusSpy2).toBeCalledTimes(1);
  });

  test('focuses on a editor if none of the editors are focused', () => {
    let editor1 = createTestEditor();
    let editor2 = createTestEditor();

    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const focusSpy2 = jest.spyOn(editor2, 'focusView');
    const { store } = createStore();

    // advance the clock so we can test the default
    // focusing behaviour
    (Date.now as jest.Mock<any>).mockImplementation(
      () => 2 * FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editor1,
        editorId: 0,
      },
    });
    expect(focusSpy1).toBeCalledTimes(1);

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editor2,
        editorId: 1,
      },
    });
    expect(focusSpy2).toBeCalledTimes(1);

    // now try closing the second editor
    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: undefined,
        editorId: 1,
      },
    });

    // the first editor should be called since nothing is focused
    expect(focusSpy1).toBeCalledTimes(2);
    expect(focusSpy2).toBeCalledTimes(1);
  });

  test('does not run focus effect if editors did not change', () => {
    let editor1 = createTestEditor();
    let editor2 = createTestEditor();

    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const focusSpy2 = jest.spyOn(editor2, 'focusView');
    const { store } = createStore();

    // advance the clock so we can test the default
    // focusing behavior
    (Date.now as jest.Mock<any>).mockImplementation(
      () => 2 * FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    for (let i = 0; i < 5; i++) {
      store.dispatch({
        name: 'action::editor-manager-context:set-editor',
        value: {
          editor: editor1,
          editorId: 0,
        },
      });
      store.dispatch({
        name: 'action::editor-manager-context:set-editor',
        value: {
          editor: editor2,
          editorId: 1,
        },
      });
    }
    expect(focusSpy1).toBeCalledTimes(1);
    expect(focusSpy2).toBeCalledTimes(1);
  });

  test('sets focus on the correct editor on mount', () => {
    (Date.now as jest.Mock<any>).mockImplementation(() => 1000);

    let mockEditorFirst = createTestEditor();
    let mockEditorSecond = createTestEditor();

    const focusSpy1 = jest.spyOn(mockEditorFirst, 'focusView');
    const focusSpy2 = jest.spyOn(mockEditorSecond, 'focusView');

    const { store } = createStore({
      focusedEditorId: 1,
      editorConfig: {},
    });

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: mockEditorFirst,
        editorId: 0,
      },
    });

    // since initial focus is on the second one
    // setting the first editor shouldn't trigger focus
    expect(focusSpy1).toBeCalledTimes(0);
    expect(focusSpy2).toBeCalledTimes(0);

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: mockEditorSecond,
        editorId: 1,
      },
    });

    expect(focusSpy1).toBeCalledTimes(0);
    expect(focusSpy2).toBeCalledTimes(1);

    // Set a new editor at editorId=1
    // and it should not get focused since we are
    // within the cooldown time
    const mockEditor3 = createEditorFromMd('test:third.md');
    const focusSpy3 = jest.spyOn(mockEditor3, 'focusView');

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: mockEditor3,
        editorId: 1,
      },
    });

    // once initially set no more calls to focus
    // while we are within cooldown time
    expect(focusSpy3).toBeCalledTimes(0);

    // advance the clock
    (Date.now as jest.Mock<any>).mockImplementation(
      () => FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    // Set another editor at editorId=1
    // to test if it gets focused or not
    const mockEditor4 = createEditorFromMd('test:fourth.md');
    const focusSpy4 = jest.spyOn(mockEditor4, 'focusView');

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: mockEditor4,
        editorId: 1,
      },
    });

    expect(focusSpy1).toBeCalledTimes(0);
    expect(focusSpy2).toBeCalledTimes(1);
    expect(focusSpy3).toBeCalledTimes(0);
    // correctly focuses on the new editor (4th)
    // since cooldown time has elapsed
    expect(focusSpy4).toBeCalledTimes(1);

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: undefined,
        editorId: 1,
      },
    });

    expect(focusSpy1).toBeCalledTimes(1);
    expect(focusSpy2).toBeCalledTimes(1);
    expect(focusSpy3).toBeCalledTimes(0);
    expect(focusSpy4).toBeCalledTimes(1);
  });
});

describe('initialSelectionEffect', () => {
  test('works', () => {
    let mockEditor = createEditorFromMd(`# hello world`, {
      pluginMetadata: { wsPath: 'test:first.md' },
    });
    let mockEditor2 = createEditorFromMd(`# bye world`, {
      pluginMetadata: { wsPath: 'test:second.md' },
    });
    let { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: mockEditor,
        editorId: 0,
      },
    });

    expect(dispatchSpy).toBeCalledTimes(1);

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: mockEditor2,
        editorId: 0,
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith({
      id: expect.any(String),
      name: 'action::editor-manager-context:update-initial-selection-json',
      value: {
        wsPath: 'test:first.md',
        editorId: 0,
        selectionJson: mockEditor.view.state.selection.toJSON(),
      },
    });

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: mockEditor2,
        editorId: 0,
      },
    });

    // dispatching the same editor should not call update initialSelection
    expect(
      getDispatchedAction(
        dispatchSpy,
        'action::editor-manager-context:update-initial-selection-json',
      ),
    ).toHaveLength(1);
  });
});

describe('watchEditorScrollEffect', () => {
  let origAddEventListener = window.addEventListener;
  let origRemoveEventListener = window.removeEventListener;

  beforeEach(() => {
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
    getScrollParentElementMock.mockImplementation(() => undefined);
  });

  afterEach(() => {
    window.addEventListener = origAddEventListener;
    window.removeEventListener = origRemoveEventListener;
  });

  test('works', () => {
    getScrollParentElementMock.mockImplementation((): any => ({
      scrollTop: 5,
    }));

    let { store, dispatchSpy } = createStore();
    let mockEditor = createEditorFromMd(`# hello world`, {
      pluginMetadata: { wsPath: 'test:first.md' },
    });

    store.dispatch({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: mockEditor,
        editorId: 0,
      },
    });

    expect(window.addEventListener).toBeCalledTimes(1);
    expect(window.addEventListener).nthCalledWith(
      1,
      'scroll',
      expect.any(Function),
      {
        capture: true,
        passive: true,
      },
    );

    const updateScroll = (window.addEventListener as any).mock.calls[0][1];

    updateScroll();

    expect(getActionsDispatched(dispatchSpy)).toMatchInlineSnapshot(`
      Array [
        "action::editor-manager-context:set-editor",
        "action::editor-manager-context:update-scroll-position",
      ]
    `);

    expect(
      getDispatchedAction(
        dispatchSpy,
        'action::editor-manager-context:update-scroll-position',
      ),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'action::editor-manager-context:update-scroll-position',
        value: {
          editorId: 0,
          scrollPosition: 5,
          wsPath: 'test:first.md',
        },
      },
    ]);

    store.destroy();

    expect(window.addEventListener).toBeCalledTimes(1);
    expect(window.removeEventListener).toBeCalledTimes(1);
  });
});
