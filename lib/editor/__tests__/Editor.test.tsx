import { act, render, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { BangleEditor } from '@bangle.dev/core';
import { Node, Selection } from '@bangle.dev/pm';

import { EditorDisplayType } from '@bangle.io/constants';
import {
  editorUnmountOp,
  getInitialSelection,
  onEditorReadyOp,
  useEditorManagerContext,
} from '@bangle.io/editor-manager-context';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { createPMNode } from '@bangle.io/test-utils/create-pm-node';
import { createExtensionRegistry } from '@bangle.io/test-utils/extension-registry';
import { getUseEditorManagerContextReturn } from '@bangle.io/test-utils/function-mock-return';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { Editor, useGetEditorState } from '../Editor';

const extensionRegistry = createExtensionRegistry([], {
  editorCore: true,
});

jest.mock('@bangle.io/workspace-context', () => {
  const actual = jest.requireActual('@bangle.io/workspace-context');
  return {
    ...actual,
    useWorkspaceContext: jest.fn(),
  };
});

jest.mock('@bangle.io/editor-manager-context', () => {
  const actual = jest.requireActual('@bangle.io/editor-manager-context');
  return {
    ...actual,
    getInitialSelection: jest.fn(() => () => {}),
    onEditorReadyOp: jest.fn(() => () => {}),
    editorUnmountOp: jest.fn(() => () => {}),
    useEditorManagerContext: jest.fn(),
  };
});

let useEditorManagerContextMock =
  useEditorManagerContext as jest.MockedFunction<
    typeof useEditorManagerContext
  >;

jest.mock('@bangle.io/extension-registry', () => {
  const actual = jest.requireActual('@bangle.io/extension-registry');
  return {
    ...actual,
    useExtensionRegistryContext: jest.fn(),
  };
});

const generateDoc = (text = 'Hello world! I am a test') =>
  Node.fromJSON(extensionRegistry.specRegistry.schema, {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: {
          level: 1,
        },
        content: [
          {
            type: 'text',
            text: 'Hola',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  });

let getNote, result: ReturnType<typeof render>;

beforeEach(() => {
  getNote = jest.fn().mockResolvedValue(generateDoc());

  (useWorkspaceContext as any).mockImplementation(() => {
    return {
      getNote,
    };
  });

  (useExtensionRegistryContext as any).mockImplementation(() => {
    return extensionRegistry;
  });

  useEditorManagerContextMock.mockImplementation(() => {
    return {
      ...getUseEditorManagerContextReturn,
    };
  });
});

test('basic renders', async () => {
  act(() => {
    result = render(
      <div>
        <Editor
          editorId={1}
          wsPath="something:blah.md"
          className="test-class"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(result!.container.innerHTML).toContain('Hello world! I am a test');
  expect(result!.container).toMatchSnapshot();
});

test('calls getInitialSelection correctly', async () => {
  act(() => {
    result = render(
      <div>
        <Editor
          editorId={1}
          wsPath="something:blah.md"
          className="test-class"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(getInitialSelection).toBeCalledTimes(1);
  expect(getInitialSelection).nthCalledWith(
    1,
    1,
    'something:blah.md',
    await getNote(),
  );
});

test('mounting unmounting calls the correct action', async () => {
  act(() => {
    result = render(
      <div>
        <Editor
          editorId={1}
          wsPath="something:blah.md"
          className="test-class"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(onEditorReadyOp).toBeCalledTimes(1);
  expect(onEditorReadyOp).nthCalledWith(
    1,
    1,
    'something:blah.md',
    expect.any(BangleEditor),
  );

  expect(editorUnmountOp).toBeCalledTimes(0);

  const editorRef = (onEditorReadyOp as any).mock.calls[0][2];
  expect(editorRef).not.toBeFalsy();

  result.unmount();

  expect(onEditorReadyOp).toBeCalledTimes(1);
  expect(editorUnmountOp).toBeCalledTimes(1);
  expect(editorUnmountOp).nthCalledWith(1, 1, expect.any(BangleEditor));
  expect((editorUnmountOp as any).mock.calls[0][1]).toBe(editorRef);
});

test('works without editorId', async () => {
  act(() => {
    result = render(
      <div>
        <Editor wsPath="something:blah.md" className="test-class" />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(result!.container.innerHTML).toContain('Hello world! I am a test');
  expect(result!.container).toMatchSnapshot();
});

test('changing of wsPath works', async () => {
  getNote = jest.fn(async (wsPath) => {
    if (wsPath.endsWith('one.md')) {
      return generateDoc('one note');
    }
    if (wsPath.endsWith('two.md')) {
      return generateDoc('two note');
    }
    throw new Error('Unknown wsPath');
  });

  act(() => {
    result = render(
      <div>
        <Editor editorId={1} className="test-class" wsPath="something:one.md" />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(result!.container.innerHTML).toContain('one note');

  act(() => {
    result.rerender(
      <div>
        <Editor editorId={1} wsPath="something:two.md" className="test-class" />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(getNote).toBeCalledTimes(2);

  expect(result!.container.innerHTML).toContain('two note');
});

describe('useGetEditorState', () => {
  test('generates correct state', () => {
    const { result } = renderHook(() =>
      useGetEditorState({
        editorId: 0,
        extensionRegistry,
        initialValue: '',
        wsPath: 'something:one.md',
        editorDisplayType: EditorDisplayType.Page,
        dispatchAction: jest.fn(),
        initialSelection: undefined,
      }),
    );

    expect(result.current?.pmState.toJSON()).toMatchInlineSnapshot(`
      Object {
        "doc": Object {
          "content": Array [
            Object {
              "type": "paragraph",
            },
          ],
          "type": "doc",
        },
        "selection": Object {
          "anchor": 1,
          "head": 1,
          "type": "text",
        },
      }
    `);
    expect(result.current?.specRegistry).toBeTruthy();
  });

  test('when initial selection is provided', () => {
    const pmNode = createPMNode([], `# Hello World`.trim());

    const { result } = renderHook(() =>
      useGetEditorState({
        editorId: 0,
        extensionRegistry,
        initialValue: pmNode,
        wsPath: 'something:one.md',
        editorDisplayType: EditorDisplayType.Page,
        dispatchAction: jest.fn(),
        initialSelection: Selection.fromJSON(pmNode, {
          anchor: 5,
          head: 5,
          type: 'text',
        }),
      }),
    );

    expect(result.current?.pmState.toJSON().selection).toEqual({
      anchor: 5,
      head: 5,
      type: 'text',
    });

    expect(result.current?.pmState.toJSON()).toMatchInlineSnapshot(`
      Object {
        "doc": Object {
          "content": Array [
            Object {
              "attrs": Object {
                "collapseContent": null,
                "level": 1,
              },
              "content": Array [
                Object {
                  "text": "Hello World",
                  "type": "text",
                },
              ],
              "type": "heading",
            },
          ],
          "type": "doc",
        },
        "selection": Object {
          "anchor": 5,
          "head": 5,
          "type": "text",
        },
      }
    `);
    expect(result.current?.specRegistry).toBeTruthy();
  });
});
