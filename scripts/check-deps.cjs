const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('.');
const graph = {};
const aliases = {
  '@workspace/ui-shared': 'packages/ui-shared/src',
  '@workspace/livex-core': 'packages/livex-core/src',
  '@workspace/ui-android': 'packages/ui-android/src',
  '@workspace/ui-web': 'packages/ui-web/src'
};

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const deps = [];
    const regex = /from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        deps.push(match[1]);
    }
    graph[f] = deps;
});

console.log(Object.keys(graph).length + ' files analyzed.');

// Check for circular dependencies
function checkCircular(file, visited, stack) {
  if (stack.includes(file)) {
    const cycle = stack.slice(stack.indexOf(file)).concat(file);
    return cycle;
  }
  if (visited.includes(file)) return null;
  visited.push(file);
  stack.push(file);

  const deps = graph[file] || [];
  for (const dep of deps) {
    let resolvedDep = null;
    if (dep.startsWith('.')) {
      resolvedDep = path.resolve(path.dirname(file), dep);
      if (!resolvedDep.endsWith('.ts') && !resolvedDep.endsWith('.tsx') && !resolvedDep.endsWith('.js')) {
        if (fs.existsSync(resolvedDep + '.ts')) resolvedDep += '.ts';
        else if (fs.existsSync(resolvedDep + '.tsx')) resolvedDep += '.tsx';
        else if (fs.existsSync(resolvedDep + '.js')) resolvedDep += '.js';
        else if (fs.existsSync(path.join(resolvedDep, 'index.ts'))) resolvedDep = path.join(resolvedDep, 'index.ts');
        else if (fs.existsSync(path.join(resolvedDep, 'index.tsx'))) resolvedDep = path.join(resolvedDep, 'index.tsx');
      }
    } else {
      for (const [alias, relPath] of Object.entries(aliases)) {
        if (dep.startsWith(alias)) {
          const suffix = dep.slice(alias.length);
          resolvedDep = path.resolve(process.cwd(), relPath, suffix === '' ? 'index.ts' : (suffix.startsWith('/') ? suffix.slice(1) : suffix));
          if (!resolvedDep.endsWith('.ts') && !resolvedDep.endsWith('.tsx') && !resolvedDep.endsWith('.js')) {
            if (fs.existsSync(resolvedDep + '.ts')) resolvedDep += '.ts';
            else if (fs.existsSync(resolvedDep + '.tsx')) resolvedDep += '.tsx';
            else if (fs.existsSync(resolvedDep + '.js')) resolvedDep += '.js';
            else if (fs.existsSync(path.join(resolvedDep, 'index.ts'))) resolvedDep = path.join(resolvedDep, 'index.ts');
            else if (fs.existsSync(path.join(resolvedDep, 'index.tsx'))) resolvedDep = path.join(resolvedDep, 'index.tsx');
          }
          break;
        }
      }
    }
    if (resolvedDep && graph[resolvedDep]) {
      const cycle = checkCircular(resolvedDep, visited, stack);
      if (cycle) return cycle;
    }
  }
  stack.pop();
  return null;
}

const visited = [];
for (const file of Object.keys(graph)) {
  const cycle = checkCircular(file, visited, []);
  if (cycle) {
    console.log('Circular dependency found:');
    console.log(cycle.join(' -> '));
  }
}
