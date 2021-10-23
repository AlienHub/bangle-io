import { act, renderHook } from '@testing-library/react-hooks';

import { RecencyRecords, useRecencyMonitor } from 'utils';
import { OpenedWsPaths } from 'ws-path';
import { useRecentlyUsedWsPaths } from '../use-recently-used-ws-paths';

jest.mock('utils', () => {
  const actual = jest.requireActual('utils');
  return {
    ...actual,
    useRecencyMonitor: jest.fn(),
  };
});

test('returns wsPaths correctly', () => {
  let records: RecencyRecords = [{ key: 'test-ws:note1.md', timestamps: [1] }],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { result } = renderHook(() =>
    useRecentlyUsedWsPaths(
      'test-ws',
      new OpenedWsPaths(['test-ws:note1.md', null]),
      ['test-ws:note1.md'],
    ),
  );
  expect(result.current).toEqual(['test-ws:note1.md']);
});

test('removes non existent wsPaths', () => {
  let records: RecencyRecords = [{ key: 'test-ws:note2.md', timestamps: [1] }],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { result } = renderHook(() =>
    useRecentlyUsedWsPaths(
      'test-ws',
      new OpenedWsPaths(['test-ws:note1.md', null]),
      ['test-ws:note1.md'],
    ),
  );
  expect(result.current).toEqual([]);
});

test('works', async () => {
  let records = [],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { result } = renderHook(() =>
    useRecentlyUsedWsPaths(
      'test-ws',
      new OpenedWsPaths(['test-ws:note1.md', null]),
      ['test-ws:note1.md'],
    ),
  );

  expect(updateRecord).toHaveBeenCalledTimes(1);
  expect(updateRecord).nthCalledWith(1, 'test-ws:note1.md');

  expect(result.current).toEqual([]);
});

test('works when no wsName', async () => {
  let records = [],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { result } = renderHook(() =>
    useRecentlyUsedWsPaths(
      undefined,
      new OpenedWsPaths(['test-ws:note1.md', null]),
      ['test-ws:note1.md'],
    ),
  );

  expect(updateRecord).toHaveBeenCalledTimes(0);

  expect(result.current).toEqual([]);
});

test('updates the newly opened ws path only', async () => {
  let records = [],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { result, rerender } = renderHook(
    ({ wsName, openedWsPaths, wsPaths }) =>
      useRecentlyUsedWsPaths(wsName, openedWsPaths, wsPaths),
    {
      initialProps: {
        wsName: 'test-ws',
        openedWsPaths: new OpenedWsPaths(['test-ws:note1.md', null]),
        wsPaths: ['test-ws:note1.md', 'test-ws:note2.md'],
      },
    },
  );

  expect(updateRecord).toHaveBeenCalledTimes(1);
  expect(updateRecord).nthCalledWith(1, 'test-ws:note1.md');

  act(() => {
    rerender({
      wsName: 'test-ws',
      openedWsPaths: new OpenedWsPaths([
        'test-ws:note1.md',
        'test-ws:note2.md',
      ]),
      wsPaths: ['test-ws:note1.md'],
    });
  });

  expect(updateRecord).toHaveBeenCalledTimes(2);
  expect(updateRecord).nthCalledWith(2, 'test-ws:note2.md');

  expect(result.current).toEqual([]);
});
