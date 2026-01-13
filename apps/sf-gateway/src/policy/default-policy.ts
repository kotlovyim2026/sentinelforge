import { PolicyDocument } from './policy.types';

export const buildDefaultPolicy = (): PolicyDocument => ({
  policy_id: 'sentinelforge-default',
  name: 'Default SentinelForge Policy',
  enabled: true,
  version: 1,
  rules: [
    {
      rule_id: 'r-admin-all',
      description: 'Admins can do anything in their org',
      effect: 'allow',
      when: {
        all: [
          { eq: ['subject.org_id', 'resource.org_id'] },
          { includes: ['subject.roles', 'admin'] },
        ],
      },
    },
    {
      rule_id: 'r-cross-org-deny',
      description: 'Deny cross-org access',
      effect: 'deny',
      reason: 'Cross-org access is not allowed',
      when: { ne: ['subject.org_id', 'resource.org_id'] },
    },
    {
      rule_id: 'r-viewer-evidence-deny',
      description: 'Viewers cannot read evidence',
      effect: 'deny',
      reason: 'Viewers are not allowed to access evidence',
      when: {
        all: [
          { includes: ['subject.roles', 'viewer'] },
          { eq: ['action', 'evidence.read'] },
        ],
      },
    },
    {
      rule_id: 'r-viewer-incident-read',
      description: 'Viewers can read incidents in their org',
      effect: 'allow',
      when: {
        all: [
          { includes: ['subject.roles', 'viewer'] },
          { eq: ['subject.org_id', 'resource.org_id'] },
          { eq: ['action', 'incident.read'] },
        ],
      },
    },
    {
      rule_id: 'r-analyst-incident-read',
      description: 'Analysts can read incidents in their org',
      effect: 'allow',
      when: {
        all: [
          { includes: ['subject.roles', 'analyst'] },
          { eq: ['subject.org_id', 'resource.org_id'] },
          { eq: ['action', 'incident.read'] },
        ],
      },
    },
    {
      rule_id: 'r-analyst-incident-update',
      description: 'Analysts can update incidents in their org',
      effect: 'allow',
      when: {
        all: [
          { includes: ['subject.roles', 'analyst'] },
          { eq: ['subject.org_id', 'resource.org_id'] },
          { eq: ['action', 'incident.update'] },
          {
            any: [
              { lt: ['context.requested_severity', 5] },
              {
                all: [
                  { eq: ['context.requested_severity', 5] },
                  { eq: ['subject.is_oncall', true] },
                ],
              },
              { eq: ['context.requested_severity', null] },
            ],
          },
        ],
      },
    },
    {
      rule_id: 'r-incident-export-admin',
      description: 'Only admins can export incidents',
      effect: 'allow',
      when: {
        all: [
          { includes: ['subject.roles', 'admin'] },
          { eq: ['subject.org_id', 'resource.org_id'] },
          { eq: ['action', 'incident.export'] },
        ],
      },
      reason: 'Admins only can export incidents',
    },
    {
      rule_id: 'r-evidence-read-analyst',
      description: 'Analysts can read evidence in their org',
      effect: 'allow',
      when: {
        all: [
          { includes: ['subject.roles', 'analyst'] },
          { eq: ['subject.org_id', 'resource.org_id'] },
          { eq: ['action', 'evidence.read'] },
        ],
      },
    },
    {
      rule_id: 'r-evidence-add',
      description: 'Analysts and admins can add evidence',
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
          { eq: ['action', 'evidence.add'] },
        ],
      },
    },
    {
      rule_id: 'r-playbook-run-analyst',
      description: 'Analysts can run playbooks up to High severity',
      effect: 'allow',
      when: {
        all: [
          { eq: ['subject.org_id', 'resource.org_id'] },
          { includes: ['subject.roles', 'analyst'] },
          { eq: ['action', 'playbook.run'] },
          { lte: ['resource.severity', 4] },
        ],
      },
      reason: 'Analysts may only run playbooks for severity <= High',
    },
    {
      rule_id: 'r-integration-manage-admin',
      description: 'Only admins can manage integrations',
      effect: 'allow',
      when: {
        all: [
          { includes: ['subject.roles', 'admin'] },
          { eq: ['subject.org_id', 'resource.org_id'] },
          { eq: ['action', 'integration.manage'] },
        ],
      },
      reason: 'Integrations are restricted to admins',
    },
    {
      rule_id: 'r-policy-manage-admin',
      description: 'Only admins can manage policies',
      effect: 'allow',
      when: {
        all: [
          { includes: ['subject.roles', 'admin'] },
          { eq: ['subject.org_id', 'resource.org_id'] },
          { in: ['action', ['policy.manage', 'policy.simulate']] },
        ],
      },
      reason: 'Policy changes require admin role',
    },
    {
      rule_id: 'r-policy-read-admin',
      description: 'Admins can read policy documents',
      effect: 'allow',
      when: {
        all: [
          { includes: ['subject.roles', 'admin'] },
          { eq: ['subject.org_id', 'resource.org_id'] },
          { eq: ['action', 'policy.read'] },
        ],
      },
    },
  ],
  default: {
    effect: 'deny',
    reason: 'No matching policy rule',
  },
});
