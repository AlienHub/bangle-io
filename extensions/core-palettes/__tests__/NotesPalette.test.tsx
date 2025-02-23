import { act, renderHook } from '@testing-library/react-hooks';

import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import { getUseWorkspaceContextReturn } from '@bangle.io/test-utils/function-mock-return';
import { sleep } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { useSearchWsPaths } from '../NotesPalette';

jest.mock('@bangle.io/naukar-proxy', () => {
  return {
    naukarWorkerProxy: {
      abortableFzfSearchNoteWsPaths: jest.fn(),
    },
  };
});

jest.mock('@bangle.io/workspace-context', () => {
  const workspaceThings = jest.requireActual('@bangle.io/workspace-context');
  return {
    ...workspaceThings,
    useWorkspaceContext: jest.fn(),
  };
});

let abortableFzfSearchNoteWsPathsMock =
  naukarWorkerProxy.abortableFzfSearchNoteWsPaths as jest.MockedFunction<
    typeof naukarWorkerProxy.abortableFzfSearchNoteWsPaths
  >;

let useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;

beforeEach(async () => {
  abortableFzfSearchNoteWsPathsMock.mockImplementation(async () => {
    return [];
  });

  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
    };
  });
});

describe('useSearchWsPaths', () => {
  test('works correctly', async () => {
    const EMPTY_ARRAY = [];
    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        recentWsPaths: EMPTY_ARRAY,
      };
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useSearchWsPaths(''),
    );

    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current).toEqual({ other: [], recent: [] });
  });

  test('renders correctly', async () => {
    const recentWsPaths = ['test-ws:note2.md'];
    const noteWsPaths = ['test-ws:note1.md', 'test-ws:note2.md'];

    abortableFzfSearchNoteWsPathsMock.mockImplementation(async () =>
      noteWsPaths.map((r) => ({ item: r } as any)),
    );

    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        recentWsPaths,
      };
    });

    let result, waitForNextUpdate;

    act(() => {
      ({ result, waitForNextUpdate } = renderHook(() => useSearchWsPaths('')));
    });

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(abortableFzfSearchNoteWsPathsMock).toBeCalledTimes(1);

    expect(result.current).toEqual({
      other: ['test-ws:note1.md'],
      recent: ['test-ws:note2.md'],
    });
  });

  test('queries correctly', async () => {
    const noteWsPaths = ['test-ws:note1.md', 'test-ws:note2.md'];
    const recentWsPaths = ['test-ws:note2.md'];

    abortableFzfSearchNoteWsPathsMock.mockImplementation(async () =>
      noteWsPaths.map((r) => ({ item: r } as any)),
    );

    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        recentWsPaths: recentWsPaths,
      };
    });

    let result, waitForNextUpdate;

    act(() => {
      ({ result, waitForNextUpdate } = renderHook(() => useSearchWsPaths('2')));
    });

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(abortableFzfSearchNoteWsPathsMock).toBeCalledTimes(1);
    expect(abortableFzfSearchNoteWsPathsMock).nthCalledWith(
      1,
      expect.any(AbortSignal),
      'test-ws',
      '2',
      64,
    );

    expect(result.current).toEqual({
      other: ['test-ws:note1.md'],
      recent: ['test-ws:note2.md'],
    });
  });

  test('if empty query returns all recent wspaths', async () => {
    const noteWsPaths = [
      'test-ws:note1.md',
      'test-ws:note2.md',
      'test-ws:note3.md',
    ];
    const recentWsPaths = ['test-ws:note2.md', 'test-ws:note3.md'];
    abortableFzfSearchNoteWsPathsMock.mockImplementation(async () => {
      await sleep(100);
      return noteWsPaths.map((r) => ({ item: r } as any));
    });

    (useWorkspaceContext as any).mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        recentWsPaths,
      };
    });

    let result, waitForNextUpdate;

    act(() => {
      ({ result, waitForNextUpdate } = renderHook(() => useSearchWsPaths('')));
    });
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current).toEqual({
      other: ['test-ws:note1.md'],
      recent: ['test-ws:note2.md', 'test-ws:note3.md'],
    });
  });
});
