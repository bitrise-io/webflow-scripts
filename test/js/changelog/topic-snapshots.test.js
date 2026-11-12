import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTopicSnapshots, selectTopicsToFetch, toSnapshot } from '../../../src/js/changelog/topic-snapshots';

const discourseTopic = (id) => ({
  id,
  title: `Topic ${id}`,
  fancy_title: `Topic ${id}`,
  slug: `topic-${id}`,
  created_at: '2026-11-12T15:07:04.285Z',
  tags: [{ id: 1, slug: 'new-feature' }, 'step-update'],
  views: 123,
  post_stream: {
    posts: [
      { id: id * 10, cooked: '<p>body</p>', username: 'someone' },
      { id: id * 10 + 1, cooked: '<p>reply</p>' },
    ],
  },
});

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('selectTopicsToFetch', () => {
  const topics = [
    { id: 4, bumped_at: 'd' },
    { id: 0, slug: 'rm-v1-20261101' },
    { id: 3, bumped_at: 'c' },
    { id: 2, bumped_at: 'b2' },
    { id: 1, bumped_at: 'a' },
  ];
  const manifest = { topics: { 4: 'd', 2: 'b', 1: 'a' } };

  it('selects missing and bumped topics, never Release Management entries', () => {
    const selected = selectTopicsToFetch(topics, manifest, { refreshNewest: 0 });
    expect(selected.map((topic) => topic.id)).toEqual([3, 2]);
  });

  it('always refreshes the newest topics', () => {
    const selected = selectTopicsToFetch(topics, manifest, { refreshNewest: 1 });
    expect(selected.map((topic) => topic.id)).toEqual([4, 3, 2]);
  });

  it('caps the number of fetches, newest first', () => {
    const selected = selectTopicsToFetch(topics, { topics: {} }, { refreshNewest: 0, maxFetches: 2 });
    expect(selected.map((topic) => topic.id)).toEqual([4, 3]);
  });
});

describe('toSnapshot', () => {
  it('keeps only what the topic page renders', () => {
    expect(toSnapshot(discourseTopic(7))).toEqual({
      id: 7,
      title: 'Topic 7',
      fancy_title: 'Topic 7',
      slug: 'topic-7',
      created_at: '2026-11-12T15:07:04.285Z',
      tags: ['new-feature', 'step-update'],
      post_stream: { posts: [{ id: 70, cooked: '<p>body</p>' }] },
    });
  });
});

describe('buildTopicSnapshots', () => {
  let outDir;
  const readJson = (name) => JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8'));
  const topics = [
    { id: 3, bumped_at: 'c' },
    { id: 2, bumped_at: 'b' },
    { id: 1, bumped_at: 'a' },
  ];

  beforeEach(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-topics-'));
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('writes snapshots for topics missing from the published manifest', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url.includes('index.json')) return json({ topics: { 1: 'a', 99: 'gone' } });
      return json(discourseTopic(Number(url.match(/\/t\/(\d+)\.json/)[1])));
    });

    const result = await buildTopicSnapshots(topics, { outDir, fetchImpl, delayMs: 0 });

    expect(result).toEqual({ written: 3, pending: 0, rateLimited: false });
    expect(readJson('2.json').post_stream.posts).toEqual([{ id: 20, cooked: '<p>body</p>' }]);
    expect(readJson('index.json')).toEqual({ topics: { 1: 'a', 2: 'b', 3: 'c' } });
  });

  it('stops at the first rate limited response and leaves the rest pending', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url.includes('index.json')) return json({}, 404);
      if (url.endsWith('/t/3.json')) return json(discourseTopic(3));
      return new Response('Too Many Requests', { status: 429 });
    });

    const result = await buildTopicSnapshots(topics, { outDir, fetchImpl, delayMs: 0 });

    expect(result).toEqual({ written: 1, pending: 2, rateLimited: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(readJson('index.json')).toEqual({ topics: { 3: 'c' } });
    expect(fs.existsSync(path.join(outDir, '2.json'))).toBe(false);
  });

  it('skips a topic that fails without aborting the run', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url.includes('index.json')) return json({ topics: {} });
      if (url.endsWith('/t/2.json')) return json({ id: 2, post_stream: { posts: [] } });
      return json(discourseTopic(Number(url.match(/\/t\/(\d+)\.json/)[1])));
    });

    const result = await buildTopicSnapshots(topics, { outDir, fetchImpl, delayMs: 0 });

    expect(result).toEqual({ written: 2, pending: 1, rateLimited: false });
  });
});
