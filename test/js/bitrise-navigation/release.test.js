import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const {
  release,
  bootstrapScript,
  legacyLoaderScript,
  MANIFEST_BUCKET_MS,
} = require('../../../src/js/bitrise-navigation/release');

const BASE = 'https://cdn.example.test/';

describe('navigation release', () => {
  let dir;
  const write = (name, content) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, content);
    return file;
  };
  const run = (component, data, outName = 'out') =>
    release({
      component: write('c.js', component),
      data: write('d.js', data),
      out: path.join(dir, outName),
      base: BASE,
    });
  const read = (outName, file) => fs.readFileSync(path.join(dir, outName, file), 'utf8');

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-release-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('writes content-hashed assets, a manifest and the two stable entry points', async () => {
    const { manifest, files } = await run('component-code', 'data-payload');

    expect(manifest.component).toMatch(/^bitrise-navigation\/bitrise-navigation\.[0-9a-f]{12}\.js$/);
    expect(manifest.data).toMatch(/^bitrise-navigation\/data\.[0-9a-f]{12}\.js$/);
    expect(manifest.base).toBe(BASE);
    expect(files).toEqual(
      [
        'bitrise-navigation.js',
        'bitrise-navigation-loader.js',
        manifest.component,
        manifest.data,
        'bitrise-navigation/manifest.js',
        'bitrise-navigation/manifest.json',
      ].sort(),
    );
    expect(read('out', manifest.component)).toBe('component-code');
    expect(read('out', manifest.data)).toBe('data-payload');
    expect(JSON.parse(read('out', 'bitrise-navigation/manifest.json'))).toEqual(manifest);
  });

  it('is deterministic: identical inputs give a byte-identical release', async () => {
    const a = await run('c', 'd', 'a');
    const b = await run('c', 'd', 'b');
    expect(a.manifest).toEqual(b.manifest);
    a.files.forEach((file) => expect(read('a', file)).toBe(read('b', file)));
  });

  it('changing the data only changes the data file and the version', async () => {
    const before = (await run('component', 'data-1', 'a')).manifest;
    const after = (await run('component', 'data-2', 'b')).manifest;
    expect(after.component).toBe(before.component);
    expect(after.data).not.toBe(before.data);
    expect(after.version).not.toBe(before.version);
  });

  it('changing the component only changes the component file and the version', async () => {
    const before = (await run('component-1', 'data', 'a')).manifest;
    const after = (await run('component-2', 'data', 'b')).manifest;
    expect(after.data).toBe(before.data);
    expect(after.component).not.toBe(before.component);
    expect(after.version).not.toBe(before.version);
  });

  it('keeps the entry points free of version information, so they never change between releases', async () => {
    await run('component-1', 'data-1', 'a');
    await run('component-2', 'data-2', 'b');
    expect(read('a', 'bitrise-navigation.js')).toBe(read('b', 'bitrise-navigation.js'));
    expect(read('a', 'bitrise-navigation-loader.js')).toBe(read('b', 'bitrise-navigation-loader.js'));
  });

  it('removes files from a previous release in the same output directory', async () => {
    await run('component-1', 'data-1', 'out');
    const second = await run('component-2', 'data-2', 'out');
    const onDisk = fs.readdirSync(path.join(dir, 'out', 'bitrise-navigation')).sort();
    expect(onDisk).toEqual(
      [
        second.manifest.component,
        second.manifest.data,
        'bitrise-navigation/manifest.js',
        'bitrise-navigation/manifest.json',
      ]
        .map((file) => path.basename(file))
        .sort(),
    );
  });

  describe('browser behaviour', () => {
    const manifestOf = async () => (await run('c', 'd', 'out')).manifest;

    // Runs `source` in a fresh page and records every element it appends to <head>.
    const runInPage = (source, now = 1700000000000) => {
      const { window } = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        runScripts: 'outside-only',
      });
      const appended = [];
      window.document.head.appendChild = (el) => {
        appended.push(el);
        return el;
      };
      window.Date.now = () => now;
      window.eval(source);
      return { window, appended };
    };

    it('bootstrap requests the manifest with a time-bucketed query string', async () => {
      const { appended } = runInPage(bootstrapScript(BASE), 1700000000000);
      expect(appended).toHaveLength(1);
      expect(appended[0].src).toBe(
        `${BASE}bitrise-navigation/manifest.js?v=${Math.floor(1700000000000 / MANIFEST_BUCKET_MS)}`,
      );
    });

    it('bootstrap loads the component named by the manifest and preloads its data', async () => {
      const manifest = await manifestOf();
      const { window, appended } = runInPage(bootstrapScript(BASE));
      window.eval(read('out', 'bitrise-navigation/manifest.js'));
      appended[0].onload();

      const [, preload, component] = appended;
      expect(preload.rel).toBe('preload');
      expect(preload.href).toBe(`${BASE}${manifest.data}`);
      expect(component.src).toBe(`${BASE}${manifest.component}`);
      expect(window.bitriseNavigationManifest).toEqual(manifest);
    });

    it('bootstrap does nothing when it is embedded twice', () => {
      const { window, appended } = runInPage(bootstrapScript(BASE));
      window.eval(bootstrapScript(BASE));
      expect(appended).toHaveLength(1);
    });

    it('bootstrap stays quiet if the manifest did not define itself', () => {
      const { appended } = runInPage(bootstrapScript(BASE));
      appended[0].onload();
      expect(appended).toHaveLength(1);
    });

    it('legacy loader forwards to the hashed data file', async () => {
      const manifest = await manifestOf();
      const { window, appended } = runInPage(legacyLoaderScript(BASE));
      window.eval(read('out', 'bitrise-navigation/manifest.js'));
      appended[0].onload();
      expect(appended[1].src).toBe(`${BASE}${manifest.data}`);
    });
  });
});
