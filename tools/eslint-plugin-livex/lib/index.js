const noHardcodedColors = require('./rules/no-hardcoded-colors');
const noInlineSprings = require('./rules/no-inline-springs');
const noStoresOutsideCore = require('./rules/no-stores-outside-core');
const noCrossFeatureImports = require('./rules/no-cross-feature-imports');
const noRawUiPrimitives = require('./rules/no-raw-ui-primitives');
const detectUnsafeRegex = require('./rules/detect-unsafe-regex');

module.exports = {
  rules: {
    'no-hardcoded-colors': noHardcodedColors,
    'no-inline-springs': noInlineSprings,
    'no-stores-outside-core': noStoresOutsideCore,
    'no-cross-feature-imports': noCrossFeatureImports,
    'no-raw-ui-primitives': noRawUiPrimitives,
    'detect-unsafe-regex': detectUnsafeRegex,
  },
};
