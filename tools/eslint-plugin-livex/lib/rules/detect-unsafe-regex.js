/**
 * ESLint rule: detect-unsafe-regex
 * Detects polynomial and exponential catastrophic backtracking (ReDoS) vulnerabilities
 * in regular expression literals and RegExp constructor calls.
 */

function isUnsafePattern(pattern) {
  if (!pattern || typeof pattern !== 'string') return false;

  let inCharClass = false;
  let isEscaped = false;
  const groupStack = [];

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '[') {
      inCharClass = true;
      continue;
    }

    if (char === ']' && inCharClass) {
      inCharClass = false;
      continue;
    }

    if (inCharClass) {
      continue;
    }

    if (char === '(') {
      groupStack.push({ hasRepetition: false, wildcardCount: 0 });
      continue;
    }

    if (char === ')') {
      const group = groupStack.pop();
      if (group) {
        let nextIdx = i + 1;
        const nextChar = nextIdx < pattern.length ? pattern[nextIdx] : '';
        const isQuantifier = nextChar === '*' || nextChar === '+' || nextChar === '{';
        if (isQuantifier && (group.hasRepetition || group.wildcardCount > 0)) {
          // Nested repetition or repeated wildcard group: (a+)+, (.*)*, (\w+)+
          return true;
        }
        if (groupStack.length > 0 && (group.hasRepetition || isQuantifier)) {
          groupStack[groupStack.length - 1].hasRepetition = true;
        }
      }
      continue;
    }

    if (char === '*' || char === '+' || char === '{') {
      if (groupStack.length > 0) {
        groupStack[groupStack.length - 1].hasRepetition = true;
      }
    }

    if (char === '.' && i + 1 < pattern.length) {
      const afterDot = pattern[i + 1];
      if (afterDot === '*' || afterDot === '+') {
        if (groupStack.length > 0) {
          groupStack[groupStack.length - 1].wildcardCount++;
        }
      }
    }
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
