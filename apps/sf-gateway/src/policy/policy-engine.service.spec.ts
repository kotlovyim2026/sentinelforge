import { PolicyEngineService } from './policy-engine.service';
import { PolicyDocument } from './policy.types';

describe('PolicyEngineService', () => {
  const engine = new PolicyEngineService();

  const baseDoc: PolicyDocument = {
    policy_id: 'p1',
    version: 1,
    rules: [],
  };

  it('returns default deny when no rules match', () => {
    const result = engine.evaluate(baseDoc, {
      action: 'incident.read',
      subject: {},
    });
    expect(result.effect).toBe('deny');
    expect(result.reason).toBe('No matching policy rule');
  });

  it('supports eq and ne', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r1',
          effect: 'allow',
          when: { eq: ['action', 'incident.read'] },
        },
        {
          rule_id: 'r2',
          effect: 'deny',
          when: { ne: ['subject.org_id', 'resource.org_id'] },
        },
      ],
    };

    const result = engine.evaluate(doc, {
      action: 'incident.read',
      subject: { org_id: '1' },
      resource: { org_id: '1' },
    });

    expect(result.effect).toBe('allow');
    expect(result.ruleId).toBe('r1');
  });

  it('supports lt/lte/gt/gte comparisons', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-lt',
          effect: 'allow',
          when: { lt: ['resource.severity', 5] },
        },
      ],
    };

    const result = engine.evaluate(doc, {
      action: 'playbook.run',
      subject: {},
      resource: { severity: 4 },
    });

    expect(result.effect).toBe('allow');
  });

  it('handles greater-or-equal comparison', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-gte',
          effect: 'deny',
          when: { gte: ['resource.severity', 5] },
        },
        {
          rule_id: 'r-allow',
          effect: 'allow',
          when: { lt: ['resource.severity', 5] },
        },
      ],
    };

    const deny = engine.evaluate(doc, {
      action: 'incident.update',
      subject: {},
      resource: { severity: 5 },
    });
    expect(deny.effect).toBe('deny');

    const allow = engine.evaluate(doc, {
      action: 'incident.update',
      subject: {},
      resource: { severity: 3 },
    });
    expect(allow.effect).toBe('allow');
  });

  it('supports includes and in', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-includes',
          effect: 'allow',
          when: { includes: ['subject.roles', 'admin'] },
        },
      ],
    };

    const result = engine.evaluate(doc, {
      action: 'incident.read',
      subject: { roles: ['admin', 'viewer'] },
    });

    expect(result.effect).toBe('allow');

    const inDoc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-in',
          effect: 'allow',
          when: { in: ['action', ['incident.read', 'incident.update']] },
        },
      ],
    };

    const inResult = engine.evaluate(inDoc, {
      action: 'incident.update',
      subject: {},
    });

    expect(inResult.effect).toBe('allow');
  });

  it('supports all/any logical operators', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-all',
          effect: 'allow',
          when: {
            all: [
              { eq: ['subject.org_id', 'resource.org_id'] },
              {
                any: [
                  { includes: ['subject.roles', 'analyst'] },
                  { includes: ['subject.roles', 'admin'] },
                ],
              },
            ],
          },
        },
      ],
    };

    const result = engine.evaluate(doc, {
      action: 'incident.update',
      subject: { org_id: 'org-1', roles: ['analyst'] },
      resource: { org_id: 'org-1' },
    });

    expect(result.effect).toBe('allow');
  });

  it('short-circuits any when one condition matches', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-any',
          effect: 'allow',
          when: {
            any: [
              { eq: ['action', 'incident.read'] },
              { eq: ['action', 'evidence.read'] },
            ],
          },
        },
      ],
    };

    const result = engine.evaluate(doc, {
      action: 'evidence.read',
      subject: {},
    });

    expect(result.effect).toBe('allow');
  });

  it('supports not operator', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-not',
          effect: 'deny',
          when: { not: { eq: ['subject.mfa_enabled', true] } },
          reason: 'MFA required',
        },
        {
          rule_id: 'r-fallback',
          effect: 'allow',
          when: { eq: ['action', 'incident.read'] },
        },
      ],
    };

    const result = engine.evaluate(doc, {
      action: 'incident.read',
      subject: { mfa_enabled: false },
    });

    expect(result.effect).toBe('deny');
    expect(result.reason).toBe('MFA required');
  });

  it('handles missing paths as null', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-null',
          effect: 'allow',
          when: { eq: ['resource.owner', null] },
        },
      ],
    };

    const result = engine.evaluate(doc, {
      action: 'incident.read',
      subject: {},
      resource: {},
    });

    expect(result.effect).toBe('allow');
  });

  it('returns default block on errors', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-err',
          effect: 'allow',
          when: { unknown: [] },
        },
      ],
    } as any;

    const result = engine.evaluate(doc, { action: 'x', subject: {} });
    expect(result.effect).toBe('deny');
  });

  it('respects first-match rule ordering', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      rules: [
        {
          rule_id: 'r-first',
          effect: 'deny',
          when: { eq: ['action', 'incident.read'] },
        },
        {
          rule_id: 'r-second',
          effect: 'allow',
          when: { eq: ['action', 'incident.read'] },
        },
      ],
    };

    const result = engine.evaluate(doc, {
      action: 'incident.read',
      subject: {},
    });
    expect(result.ruleId).toBe('r-first');
    expect(result.effect).toBe('deny');
  });

  it('uses document default section', () => {
    const doc: PolicyDocument = {
      ...baseDoc,
      default: { effect: 'deny', reason: 'Doc default' },
      rules: [
        {
          rule_id: 'r-no-match',
          effect: 'allow',
          when: { eq: ['action', 'something'] },
        },
      ],
    };

    const result = engine.evaluate(doc, { action: 'other', subject: {} });
    expect(result.reason).toBe('Doc default');
  });
});
