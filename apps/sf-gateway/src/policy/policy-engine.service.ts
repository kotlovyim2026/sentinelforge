import { Injectable, Logger } from '@nestjs/common';
import {
  Condition,
  EvaluationInput,
  EvaluationResult,
  PolicyDocument,
} from './policy.types';

@Injectable()
export class PolicyEngineService {
  private readonly logger = new Logger(PolicyEngineService.name);

  evaluate(document: PolicyDocument, input: EvaluationInput): EvaluationResult {
    const safeDeny: EvaluationResult = {
      effect: 'deny',
      reason: 'No matching policy rule',
    };

    if (!document || !document.rules || document.rules.length === 0) {
      return safeDeny;
    }

    try {
      for (const rule of document.rules) {
        if (!rule.when || this.evaluateCondition(rule.when, input)) {
          return {
            effect: rule.effect,
            reason: rule.reason || `Rule ${rule.rule_id} matched`,
            ruleId: rule.rule_id,
          };
        }
      }

      const fallback = document.default || safeDeny;
      return {
        effect: fallback.effect,
        reason: fallback.reason || safeDeny.reason,
      };
    } catch (error) {
      this.logger.error(
        `Policy evaluation failed: ${error.message}`,
        error.stack,
      );
      return {
        effect: 'deny',
        reason: 'Policy evaluation error',
      };
    }
  }

  private evaluateCondition(
    condition: Condition,
    input: EvaluationInput,
  ): boolean {
    if ('eq' in condition) {
      const [left, right] = condition.eq;
      return this.resolve(left, input) === this.resolve(right, input);
    }

    if ('ne' in condition) {
      const [left, right] = condition.ne;
      return this.resolve(left, input) !== this.resolve(right, input);
    }

    if ('lt' in condition) {
      const [left, right] = condition.lt;
      return (
        Number(this.resolve(left, input)) < Number(this.resolve(right, input))
      );
    }

    if ('lte' in condition) {
      const [left, right] = condition.lte;
      return (
        Number(this.resolve(left, input)) <= Number(this.resolve(right, input))
      );
    }

    if ('gt' in condition) {
      const [left, right] = condition.gt;
      return (
        Number(this.resolve(left, input)) > Number(this.resolve(right, input))
      );
    }

    if ('gte' in condition) {
      const [left, right] = condition.gte;
      return (
        Number(this.resolve(left, input)) >= Number(this.resolve(right, input))
      );
    }

    if ('includes' in condition) {
      const [arrayValue, value] = condition.includes;
      const resolvedArray = this.resolve(arrayValue, input);
      const resolvedValue = this.resolve(value, input);
      return Array.isArray(resolvedArray)
        ? resolvedArray.includes(resolvedValue)
        : false;
    }

    if ('in' in condition) {
      const [value, arrayValue] = condition.in;
      const resolvedArray = this.resolve(arrayValue, input);
      const resolvedValue = this.resolve(value, input);
      return Array.isArray(resolvedArray)
        ? resolvedArray.includes(resolvedValue)
        : false;
    }

    if ('all' in condition) {
      return condition.all.every((cond) => this.evaluateCondition(cond, input));
    }

    if ('any' in condition) {
      return condition.any.some((cond) => this.evaluateCondition(cond, input));
    }

    if ('not' in condition) {
      return !this.evaluateCondition(condition.not, input);
    }

    return false;
  }

  private resolve(value: unknown, input: EvaluationInput): unknown {
    if (!this.isPath(value)) {
      return value;
    }

    const path = value.split('.');
    if (path.length === 0) return null;

    const [root, ...rest] = path;
    let current: any;

    switch (root) {
      case 'subject':
        current = input.subject;
        break;
      case 'resource':
        current = input.resource;
        break;
      case 'context':
        current = input.context;
        break;
      case 'action':
        if (rest.length === 0) {
          return input.action;
        }
        current = { value: input.action };
        break;
      default:
        return value;
    }

    for (const segment of rest) {
      if (current == null) return null;
      current = current[segment];
    }

    return current ?? null;
  }

  private isPath(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    return (
      value === 'action' ||
      value.startsWith('subject.') ||
      value.startsWith('resource.') ||
      value.startsWith('context.')
    );
  }
}
