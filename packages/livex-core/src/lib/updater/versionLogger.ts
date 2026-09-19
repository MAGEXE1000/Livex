export interface RawReleaseMetadata {
  rawAppReleaseJson: string | null;
  rawVersionJson: string | null;
  rawGithubResponse: string | null;
  rawTag: string | null;
  rawReleaseName: string | null;
  rawVersionName: string | null;
  normalizedVersion: string | null;
  finalVersionShownByUi: string | null;
  sourceUsed: string | null;
  timestamp: string | null;
  cacheSource: string | null;
  parserChain: string[];
}

export let releaseMetadataInspector: RawReleaseMetadata = {
  rawAppReleaseJson: null,
  rawVersionJson: null,
  rawGithubResponse: null,
  rawTag: null,
  rawReleaseName: null,
  rawVersionName: null,
  normalizedVersion: null,
  finalVersionShownByUi: null,
  sourceUsed: null,
  timestamp: null,
  cacheSource: null,
  parserChain: [],
};

export function logRawSource(sourceName: string, content: string) {
  const ts = new Date().toISOString();
  if (sourceName === 'app-release.json') {
    releaseMetadataInspector.rawAppReleaseJson = content;
  } else if (sourceName === 'version.json') {
    releaseMetadataInspector.rawVersionJson = content;
  } else if (sourceName === 'github-releases') {
    releaseMetadataInspector.rawGithubResponse = content;
  }
  releaseMetadataInspector.timestamp = ts;
}

export function logVersionTransformation(
  funcName: string,
  input: string | null | undefined,
  output: string | null | undefined
) {
  let callerLine = 'unknown';
  let stackTrace = '';
  try {
    const err = new Error();
    const stack = err.stack || '';
    const lines = stack.split('\n');
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        !line.includes('logVersionTransformation') &&
        !line.includes('parseAndNormalizeVersion') &&
        !line.includes('parseSemver') &&
        !line.includes('normalizeSemver') &&
        !line.includes('compareSemver')
      ) {
        callerLine = line;
        stackTrace = lines
          .slice(i, i + 6)
          .map((l) => l.trim())
          .join('\n');
        break;
      }
    }
  } catch (_) {}

  const traceMsg = `Input: '${input ?? 'null'}' -> Output: '${output ?? 'null'}' -> Function: '${funcName}' -> Caller: '${callerLine}'`;
  releaseMetadataInspector.parserChain.push(`${traceMsg}\nStack:\n${stackTrace}`);
}
