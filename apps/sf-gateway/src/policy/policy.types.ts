export type PolicyEffect = 'allow' | 'deny';

export type Condition =
  | { eq: [Operand, Operand] }
  | { ne: [Operand, Operand] }
  | { lt: [Operand, Operand] }
  | { lte: [Operand, Operand] }
  | { gt: [Operand, Operand] }
  | { gte: [Operand, Operand] }
  | { includes: [Operand, Operand] }
  | { in: [Operand, Operand] }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type Operand =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[]
  | boolean[];

export interface PolicyRule {
  rule_id: string;
  description?: string;
  effect: PolicyEffect;
  reason?: string;
  when?: Condition;
}

export interface PolicyDefault {
  effect: PolicyEffect;
  reason?: string;
}

export interface PolicyDocument {
  policy_id: string;
  name?: string;
  enabled?: boolean;
  version: number;
  rules: PolicyRule[];
  default?: PolicyDefault;
}

export interface EvaluationInput {
  subject: Record<string, unknown>;
  action: string;
  resource?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface EvaluationResult {
  effect: PolicyEffect;
  reason: string;
  ruleId?: string;
}
