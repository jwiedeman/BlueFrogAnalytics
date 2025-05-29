const minimatch = require('minimatch');

class Condition {
  constructor({ extractor, type, value }) {
    this.extractor = extractor;
    this.type = type;
    this.value = value;
  }

  evaluate(flow) {
    const [source, ...pathParts] = this.extractor.split('.');
    const path = pathParts.join('.');
    let data;
    if (source === 'query') data = flow.request.query;
    else if (source === 'form') data = flow.request.form || {};
    else if (source === 'json') data = flow.request.json || {};
    else if (source === 'body') {
      // Prefer structured form or JSON for body content
      if (flow.request.form && typeof flow.request.form === 'object') data = flow.request.form;
      else if (flow.request.json && typeof flow.request.json === 'object') data = flow.request.json;
      else data = flow.request.body;
    }
    else return false;
    let value = data;
    // Drill into object if data is object (including parsed body)
    if (data && typeof data === 'object' && path) {
      for (const key of path.split('.')) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          value = undefined;
          break;
        }
      }
    }
    // Existence check
    if (this.type === 'exists') {
      return value !== undefined;
    }
    // Equality (string)
    if (this.type === 'equals') {
      return String(value) === String(this.value);
    }
    // Inclusion in list (expected comma-separated or JSON array)
    if (this.type === 'in') {
      let arr;
      if (Array.isArray(this.value)) {
        arr = this.value;
      } else {
        try {
          arr = JSON.parse(this.value);
        } catch {
          arr = String(this.value).split(',').map(s => s.trim());
        }
      }
      return Array.isArray(arr) && arr.includes(value);
    }
    // Regular expression test
    if (this.type === 'regex') {
      try {
        const re = new RegExp(this.value);
        return re.test(String(value));
      } catch {
        return false;
      }
    }
    // UUID format (v1-v5)
    if (this.type === 'uuid') {
      const reUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return reUuid.test(String(value));
    }
    // Unknown operator
    return false;
  }
}

class Rule {
  constructor({ id, domain, method, path, conditions, children }) {
    this.id = id;
    this.domain = domain;
    this.method = method.toUpperCase();
    this.path = path;
    this.conditions = conditions.map(c => new Condition(c));
    this.children = children || [];
  }

  matches(flow) {
    // Match only by method and domain; path glob no longer required
    if (flow.request.method.toUpperCase() !== this.method) return false;
    if (flow.request.host !== this.domain) return false;
    return true;
  }

  evaluate(flow) {
    return this.conditions.every(cond => cond.evaluate(flow));
  }
}

class RuleEngine {
  constructor(rules = []) {
    this.rules = new Map();
    for (const r of rules) {
      this.rules.set(r.id, new Rule(r));
    }
  }

  /**
   * Process a flow against all rules, returning evaluation results.
   * @param {object} flow - The traffic flow to evaluate
   * @returns {Array<{id: string, passed: boolean, children: Array<{id: string, passed: boolean}>}>}
   */
  process(flow) {
    const results = [];
    for (const [id, rule] of this.rules.entries()) {
      if (rule.matches(flow)) {
        const passed = rule.evaluate(flow);
        console.log(`Rule ${id} matched: ${passed ? 'PASS' : 'FAIL'}`);
        // Evaluate children only if parent passed
        const childResults = [];
        if (passed) {
          for (const childId of rule.children) {
            const child = this.rules.get(childId);
            if (child && child.matches(flow)) {
              const childPassed = child.evaluate(flow);
              console.log(`Rule ${childId} matched (child): ${childPassed ? 'PASS' : 'FAIL'}`);
              childResults.push({ id: childId, passed: childPassed });
            }
          }
        }
        results.push({ id, passed, children: childResults });
      }
    }
    return results;
  }
}

module.exports = RuleEngine;