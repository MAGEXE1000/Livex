/**
 * ESLint rule: detect-unsafe-regex
 * Detects polynomial and exponential catastrophic backtracking (ReDoS) vulnerabilities
 * in regular expression literals and RegExp constructor calls.
 */

function isUnsafePattern(pattern) {
  if (!pattern || typeof pattern !== 'string') return false;

  // 1. Nested repetition of character class, word, digit, or wildcard:
  // e.g. ([a-zA-Z0-9]+)+, (\w+)+, (\d+)+, (.*)*, (.+)+, (a+)+
  const catastrophicNested = /(?:^|[^\\])\((?:[a-zA-Z0-9_#b\s\w\d.-]+|\[[^\]]+\]|\.|\\[swdSWD])[*+](?:[a-zA-Z0-9_#b\s\w\d.-]*|\[[^\]]+\]|\.|\\[swdSWD])\)[*+]/;
  if (catastrophicNested.test(pattern)) {
    return true;
  }

  // 2. Overlapping repetition with greedy wildcard or whitespace:
  // e.g. (\s*.*)*, (\s+.*)+, (.*)*, (.*\s*)+
  const wildcardReDoS = /(?:^|[^\\])\([^)]*(?:\.\*|\.\+|\\s\*\\w\*)[^)]*\)[*+]/;
  if (wildcardReDoS.test(pattern)) {
    return true;
  }

  // 3. Repeated group containing trailing wildcard repetition:
  // e.g. (.*)+, (.*)*, (.+)+
  const greedyGroupNested = /(?:^|[^\\])\([^)]*\.[*+][^)]*\)[*+]/;
  if (greedyGroupNested.test(pattern)) {
    return true;
  }

  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect polynomial and exponential catastrophic backtracking (ReDoS) regular expressions',
      category: 'Security',
      recommended: true,
    },
    schema: [],
    messages: {
      unsafeRegex: 'Unsafe regular expression: potential polynomial or exponential backtracking (ReDoS): /{{pattern}}/',
    },
  },
  create(context) {
    function checkPattern(node, patternStr) {
      if (isUnsafePattern(patternStr)) {
        context.report({
          node,
          messageId: 'unsafeRegex',
          data: { pattern: patternStr },
        });
      }
    }

    return {
      Literal(node) {
        if (node.regex && node.regex.pattern) {
          checkPattern(node, node.regex.pattern);
        }
      },
      NewExpression(node) {
        if (node.callee && node.callee.name === 'RegExp' && node.arguments && node.arguments[0]) {
          const firstArg = node.arguments[0];
          if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
            checkPattern(node, firstArg.value);
          }
        }
      },
    };
  },
};
