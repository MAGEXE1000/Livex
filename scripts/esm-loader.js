import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react') {
    return {
      format: 'module',
      shortCircuit: true,
      url: 'data:text/javascript,export%20class%20Component%20%7B%20render()%20%7B%20return%20null%3B%20%7D%20%7D%20export%20class%20PureComponent%20extends%20Component%20%7B%7D%20export%20const%20useState%20%3D%20(init)%20%3D%3E%20globalThis.mockReact.useState(init)%3B%20export%20const%20useEffect%20%3D%20(cb%2C%20deps)%20%3D%3E%20globalThis.mockReact.useEffect(cb%2C%20deps)%3B%20export%20const%20useLayoutEffect%20%3D%20(cb%2C%20deps)%20%3D%3E%20globalThis.mockReact.useEffect(cb%2C%20deps)%3B%20export%20const%20useInsertionEffect%20%3D%20(cb%2C%20deps)%20%3D%3E%20globalThis.mockReact.useEffect(cb%2C%20deps)%3B%20export%20const%20useRef%20%3D%20(init)%20%3D%3E%20globalThis.mockReact.useRef(init)%3B%20export%20const%20useId%20%3D%20()%20%3D%3E%20%22mock-id%22%3B%20export%20const%20memo%20%3D%20(c)%20%3D%3E%20c%3B%20export%20const%20forwardRef%20%3D%20(fn)%20%3D%3E%20fn%3B%20export%20const%20useImperativeHandle%20%3D%20()%20%3D%3E%20undefined%3B%20export%20const%20useDebugValue%20%3D%20()%20%3D%3E%20undefined%3B%20export%20const%20useDeferredValue%20%3D%20(v)%20%3D%3E%20v%3B%20export%20const%20useTransition%20%3D%20()%20%3D%3E%20%5Bfalse%2C%20(cb)%20%3D%3E%20cb()%5D%3B%20export%20const%20useSyncExternalStore%20%3D%20(sub%2C%20get)%20%3D%3E%20get()%3B%20export%20const%20createContext%20%3D%20(def)%20%3D%3E%20(%7B%20Provider%3A%20(%7Bchildren%7D)%20%3D%3E%20children%2C%20Consumer%3A%20(%7Bchildren%7D)%20%3D%3E%20children(def)%20%7D)%3B%20export%20const%20useContext%20%3D%20(ctx)%20%3D%3E%20ctx%3B%20export%20const%20useCallback%20%3D%20(fn)%20%3D%3E%20fn%3B%20export%20const%20useMemo%20%3D%20(fn)%20%3D%3E%20fn()%3B%20export%20const%20Fragment%20%3D%20Symbol.for(%22react.fragment%22)%3B%20export%20const%20Suspense%20%3D%20(%7Bchildren%7D)%20%3D%3E%20children%3B%20export%20const%20StrictMode%20%3D%20(%7Bchildren%7D)%20%3D%3E%20children%3B%20export%20const%20lazy%20%3D%20(fn)%20%3D%3E%20fn%3B%20export%20const%20createElement%20%3D%20()%20%3D%3E%20(%7B%7D)%3B%20export%20const%20cloneElement%20%3D%20(el)%20%3D%3E%20el%3B%20export%20const%20isValidElement%20%3D%20()%20%3D%3E%20true%3B%20export%20const%20Children%20%3D%20%7B%20map%3A%20(c%2C%20fn)%20%3D%3E%20(c%20%3F%20%5Bc%5D.flat().map(fn)%20%3A%20%5B%5D)%2C%20forEach%3A%20(c%2C%20fn)%20%3D%3E%20(c%20%3F%20%5Bc%5D.flat().forEach(fn)%20%3A%20undefined)%2C%20count%3A%20(c)%20%3D%3E%20(c%20%3F%20%5Bc%5D.flat().length%20%3A%200)%2C%20toArray%3A%20(c)%20%3D%3E%20(c%20%3F%20%5Bc%5D.flat()%20%3A%20%5B%5D)%20%7D%3B%20export%20default%20%7B%20Component%2C%20PureComponent%2C%20useState%2C%20useEffect%2C%20useLayoutEffect%2C%20useInsertionEffect%2C%20useRef%2C%20useId%2C%20memo%2C%20forwardRef%2C%20useImperativeHandle%2C%20useDebugValue%2C%20useDeferredValue%2C%20useTransition%2C%20useSyncExternalStore%2C%20createContext%2C%20useContext%2C%20useCallback%2C%20useMemo%2C%20Fragment%2C%20Suspense%2C%20StrictMode%2C%20lazy%2C%20createElement%2C%20cloneElement%2C%20isValidElement%2C%20Children%20%7D%3B',
    };
  }
  if (specifier === '@workspace/livex-core' || specifier === '@workspace/studio-core') {
    const target = path.resolve('packages/livex-core/dist/src/index.js');
    return {
      format: 'module',
      shortCircuit: true,
      url: pathToFileURL(target).href,
    };
  }
  if (specifier.startsWith('@/')) {
    const target = path.resolve('packages/ui-shared/dist/src', specifier.slice(2) + '.js');
    if (fs.existsSync(target)) {
      return {
        format: 'module',
        shortCircuit: true,
        url: pathToFileURL(target).href,
      };
    }
  }
  if (specifier === '@capacitor/core') {
    return {
      format: 'module',
      shortCircuit: true,
      url: 'data:text/javascript,export const Capacitor = new Proxy({}, { get: (t, p) => (globalThis.Capacitor || {})[p] }); export const registerPlugin = (name) => { if (!globalThis.Capacitor) globalThis.Capacitor = { Plugins: {} }; if (!globalThis.Capacitor.Plugins) globalThis.Capacitor.Plugins = {}; return globalThis.Capacitor.Plugins[name] || (globalThis.Capacitor.Plugins[name] = {}); }; export class WebPlugin {}',
    };
  }
  if (specifier === '@capacitor/app') {
    return {
      format: 'module',
      shortCircuit: true,
      url: 'data:text/javascript,export const App = { addListener: () => ({ remove: async () => {} }) };',
    };
  }
  if (specifier === '@capacitor/filesystem') {
    return {
      format: 'module',
      shortCircuit: true,
      url: 'data:text/javascript,export const Filesystem = { stat: async () => ({ size: 5 * 1024 * 1024, uri: "file:///mock/path/to/downloaded.apk" }), deleteFile: async () => {}, getUri: async () => ({ uri: "file:///mock/path/to/downloaded.apk" }) }; export const Directory = { Cache: "CACHE", Documents: "DOCUMENTS", Data: "DATA" }; export const Encoding = { UTF8: "utf8" };',
    };
  }
  if (specifier === '@capacitor/share') {
    return {
      format: 'module',
      shortCircuit: true,
      url: 'data:text/javascript,export const Share = { share: async () => {} };',
    };
  }

  if (specifier.startsWith('.') && !specifier.endsWith('.js')) {
    const parentUrl = context.parentURL;
    if (parentUrl) {
      const parentPath = fileURLToPath(parentUrl);
      const resolvedPath = path.resolve(path.dirname(parentPath), specifier);
      if (fs.existsSync(resolvedPath + '.js')) {
        return {
          format: 'module',
          shortCircuit: true,
          url: pathToFileURL(resolvedPath + '.js').href,
        };
      }
      if (fs.existsSync(path.join(resolvedPath, 'index.js'))) {
        return {
          format: 'module',
          shortCircuit: true,
          url: pathToFileURL(path.join(resolvedPath, 'index.js')).href,
        };
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('data:text/javascript')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: decodeURIComponent(url.slice(21)),
    };
  }

  if (url.endsWith('.json')) {
    return nextLoad(url, {
      ...context,
      importAttributes: { ...context.importAttributes, type: 'json' },
    });
  }

  const result = await nextLoad(url, context);
  if (url.endsWith('.js') && result.source) {
    let sourceStr =
      typeof result.source === 'string' ? result.source : result.source.toString('utf8');
    if (sourceStr.includes('import.meta.env')) {
      sourceStr = sourceStr.replace(/import\.meta\.env/g, '(globalThis.importMetaEnv || {})');
      return {
        ...result,
        source: sourceStr,
      };
    }
  }
  return result;
}
