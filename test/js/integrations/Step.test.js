import { describe, it, expect } from 'vitest';
import Step from '../../../src/js/integrations/Step';
import { createStepData } from './fixtures';

describe('Step', () => {
  it('exposes title from latest version', () => {
    const step = new Step('test-step', createStepData({ title: 'My Step' }));
    expect(step.title).toBe('My Step');
  });

  it('exposes key from slug', () => {
    const step = new Step('test-step', createStepData());
    expect(step.key).toBe('test-step');
  });

  it('exposes categories from type_tags', () => {
    const step = new Step('test-step', createStepData({ type_tags: ['build', 'deploy'] }));
    expect(step.categories).toEqual(['build', 'deploy']);
  });

  it('defaults categories to other', () => {
    const data = createStepData();
    delete data.versions['1.0.0'].type_tags;
    const step = new Step('test-step', data);
    expect(step.categories).toEqual(['other']);
  });

  it('exposes platforms from project_type_tags', () => {
    const step = new Step('test-step', createStepData({ project_type_tags: ['ios', 'android'] }));
    expect(step.platforms).toEqual(['ios', 'android']);
  });

  it('returns null platforms when not set', () => {
    const data = createStepData();
    delete data.versions['1.0.0'].project_type_tags;
    const step = new Step('test-step', data);
    expect(step.platforms).toBeNull();
  });

  it('renders markdown description', () => {
    const step = new Step('test-step', createStepData({ description: '# Hello\n\nWorld' }));
    expect(step.formattedDescription).toContain('<h3>Hello</h3>');
    expect(step.formattedDescription).toContain('<p>World</p>');
  });

  it('renders inline markdown summary', () => {
    const step = new Step('test-step', createStepData({ summary: 'A **bold** summary' }));
    expect(step.formattedSummary).toContain('<strong>bold</strong>');
  });

  it('detects deprecated steps', () => {
    const data = createStepData();
    data.info.deprecate_notes = 'Use new-step instead';
    const step = new Step('test-step', data);
    expect(step.isDeprecated()).toBe(true);
    expect(step.deprecateNotes).toBe('Use new-step instead');
  });

  it('non-deprecated by default', () => {
    const step = new Step('test-step', createStepData());
    expect(step.isDeprecated()).toBe(false);
  });

  it('fits platform filter', () => {
    const step = new Step('test-step', createStepData({ project_type_tags: ['ios', 'android'] }));
    expect(step.fitsPlatform('ios')).toBe(true);
    expect(step.fitsPlatform('linux')).toBe(false);
    expect(step.fitsPlatform(null)).toBe(true);
  });

  it('fits category filter', () => {
    const step = new Step('test-step', createStepData({ type_tags: ['build'] }));
    expect(step.fitsCategory('build')).toBe(true);
    expect(step.fitsCategory('deploy')).toBe(false);
    expect(step.fitsCategory(null)).toBe(true);
  });

  it('fits query filter', () => {
    const step = new Step('gradle-runner', createStepData({ title: 'Gradle Runner', summary: 'Runs Gradle' }));
    expect(step.fitsQuery('gradle')).toBe(true);
    expect(step.fitsQuery('xcode')).toBe(false);
    expect(step.fitsQuery(null)).toBe(true);
  });
});
