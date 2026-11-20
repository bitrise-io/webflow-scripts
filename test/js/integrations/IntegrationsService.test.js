import { describe, it, expect } from 'vitest';
import IntegrationsService, { compactSpec } from '../../../src/js/integrations/IntegrationsService';

const spec = {
  steps: {
    'git-clone': {
      info: { maintainer: 'bitrise', asset_urls: { 'icon.svg': 'https://example.com/a.svg' } },
      versions: {
        '2.0.0': {
          title: 'Git Clone',
          summary: 'Clones a repo',
          description: 'long description that the client does not need',
          source_code_url: 'https://github.com/bitrise-steplib/steps-git-clone',
          type_tags: ['build'],
          project_type_tags: ['ios', 'android'],
        },
        '1.0.0': { title: 'Old', summary: 'Old', type_tags: ['utility'] },
      },
    },
    'old-step': {
      info: { maintainer: 'bitrise', deprecate_notes: 'Use something else' },
      versions: { '1.0.0': { title: 'Old Step', summary: 'Gone' } },
    },
  },
};

describe('compactSpec', () => {
  it('keeps only the latest version and the fields needed for filtering', () => {
    const compact = compactSpec(spec);
    expect(Object.keys(compact.steps['git-clone'].versions)).toEqual(['2.0.0']);
    expect(compact.steps['git-clone'].versions['2.0.0']).toEqual({
      title: 'Git Clone',
      summary: 'Clones a repo',
      type_tags: ['build'],
      project_type_tags: ['ios', 'android'],
    });
    expect(compact.steps['git-clone'].info).toEqual({});
    expect(JSON.stringify(compact)).not.toContain('long description');
  });

  it('builds the same categories, platforms and filter results as the full spec', () => {
    const full = IntegrationsService.fromSpec(spec);
    const compact = IntegrationsService.fromSpec(compactSpec(spec));

    expect(compact.categories.getKeys()).toEqual(full.categories.getKeys());
    expect(compact.platforms.getKeys()).toEqual(full.platforms.getKeys());
    Object.keys(full.steps).forEach((slug) => {
      expect(compact.steps[slug].isDeprecated()).toBe(full.steps[slug].isDeprecated());
      expect(compact.steps[slug].fitsQuery('clone')).toBe(full.steps[slug].fitsQuery('clone'));
      expect(compact.steps[slug].fitsPlatform('ios')).toBe(full.steps[slug].fitsPlatform('ios'));
      expect(compact.steps[slug].fitsCategory('build')).toBe(full.steps[slug].fitsCategory('build'));
    });
  });
});
