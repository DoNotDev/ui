// @vitest-environment node
// packages/ui/src/__tests__/react-server-entry.test.ts

/**
 * React Server Components entries `@donotdev/components/rsc` and `@donotdev/ui/rsc`
 * (`src/rsc.ts`), resolved only under the `react-server` condition. The package roots
 * stay the client barrels everywhere, including Next's RSC graph.
 *
 * 0. Subpaths resolve under `react-server` only; anywhere else they fail to resolve.
 * 1. Same exports as the client barrels (`src/index.ts`).
 * 2. Server graph rules: every module reached from an entry without crossing a
 *    `'use client'` file is a server module, so it must not import client-only React
 *    APIs (Next fails the build on them), call hooks, set event handlers, read browser
 *    globals in a component, or use a client-reference value other than rendering it.
 * 3. Real RSC render: the entries bundled under the `react-server` condition with
 *    Next's compiled React (`react-server` build: no useState, useContext…), every
 *    `'use client'` module replaced by client references (what Next's flight loader
 *    does), rendered with react-server-dom-webpack, then the Flight payload turned
 *    into HTML with react-dom/server in a second process. Presentational components
 *    give the same HTML as the client barrel; an interactive one is a client reference.
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import type { Plugin } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const PACKAGES = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const REPO = join(PACKAGES, '..');
const NEXT_COMPILED = join(REPO, 'node_modules/next/dist/compiled');

/** The rsc entries the graph rules start from. */
const RSC_ENTRIES = [
  join(PACKAGES, 'components/src/rsc.ts'),
  join(PACKAGES, 'ui/src/rsc.ts'),
];

/**
 * What the RSC graph resolves these specifiers to: package roots are the client
 * barrels (`'use client'`), the `/rsc` subpaths the entries, ui's platform subpaths
 * the Next files (no `vite-app`).
 */
const SERVER_ENTRIES: Record<string, string> = {
  '@donotdev/components': join(PACKAGES, 'components/src/index.ts'),
  '@donotdev/components/rsc': RSC_ENTRIES[0],
  '@donotdev/ui': join(PACKAGES, 'ui/src/index.ts'),
  '@donotdev/ui/rsc': RSC_ENTRIES[1],
  '@donotdev/ui/routing/hooks': join(PACKAGES, 'ui/src/routing/hooks/hooks.next.ts'),
  '@donotdev/ui/routing/link': join(PACKAGES, 'ui/src/routing/link/link.next.ts'),
};

/**
 * Server modules allowed to name a browser global: only in functions that never run
 * during render (documented client-only helpers).
 */
const BROWSER_GLOBAL_EXCEPTIONS = new Set([
  // currentRenditionUrl (matchMedia), called from effects; ResponsiveImg is pure
  'components/src/utils/responsiveImage.tsx',
]);

/** Source roots walked by the graph rules. */
const SOURCE_ROOTS = ['components/src/', 'ui/src/'].map((p) => join(PACKAGES, p));

/** React APIs absent from React's `react-server` build (Next rejects their import). */
const CLIENT_ONLY_REACT = new Set([
  'useState',
  'useEffect',
  'useLayoutEffect',
  'useInsertionEffect',
  'useReducer',
  'useRef',
  'useContext',
  'useSyncExternalStore',
  'useImperativeHandle',
  'useTransition',
  'useOptimistic',
  'useActionState',
  'useDeferredValue',
  'useEffectEvent',
  'useFormStatus',
  'useFormState',
  'createContext',
  'Component',
  'PureComponent',
  'createPortal',
  'flushSync',
]);

/** Hooks React's `react-server` build has. */
const SERVER_HOOKS = new Set(['useMemo', 'useCallback', 'useId', 'useDebugValue']);

/** Packages a server module may import (all server-safe). */
const SERVER_PACKAGES = new Set([
  'react',
  'lucide-react',
  'clsx',
  'class-variance-authority',
  '@donotdev/core',
  '@donotdev/components/sanitize-dom',
]);

/** Browser globals a server component must not read while rendering. */
const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'matchMedia',
]);

interface Module {
  file: string;
  source: ts.SourceFile;
  client: boolean;
}

const modules = new Map<string, Module>();

function load(file: string): Module {
  const cached = modules.get(file);
  if (cached) return cached;
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const first = source.statements[0];
  const client =
    first !== undefined &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === 'use client';
  const mod = { file, source, client };
  modules.set(file, mod);
  return mod;
}

/** Source file a specifier names, or `null` for a package outside the walked roots. */
function resolveSource(from: string, specifier: string): string | null {
  if (SERVER_ENTRIES[specifier]) return SERVER_ENTRIES[specifier];
  if (!specifier.startsWith('.')) return null;
  const base = join(dirname(from), specifier);
  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = base + ext;
    if (
      /\.tsx?$/.test(candidate) &&
      existsSync(candidate) &&
      statSync(candidate).isFile()
    ) {
      return candidate;
    }
  }
  throw new Error(`Unresolved ${specifier} from ${from}`);
}

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);

/**
 * Where export `name` of `file` comes from: the first `'use client'` module on its
 * re-export chain (a client reference), else the server module declaring it.
 * `type` for type-only declarations, `null` when not exported.
 */
function findExport(
  file: string,
  name: string
): { file: string; client: boolean } | 'type' | null {
  const mod = load(file);
  if (mod.client) return { file, client: true };
  for (const stmt of mod.source.statements) {
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue;
      const spec =
        stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)
          ? stmt.moduleSpecifier.text
          : null;
      if (!stmt.exportClause) {
        const target = spec ? resolveSource(file, spec) : null;
        if (!target || name === 'default') continue;
        if (load(target).client) {
          if (exportNames(target).includes(name)) {
            return { file: target, client: true };
          }
          continue;
        }
        const found = findExport(target, name);
        if (found) return found;
        continue;
      }
      if (!ts.isNamedExports(stmt.exportClause)) continue;
      for (const el of stmt.exportClause.elements) {
        if (el.name.text !== name) continue;
        if (el.isTypeOnly) return 'type';
        const local = (el.propertyName ?? el.name).text;
        if (!spec) return { file, client: false };
        const target = resolveSource(file, spec);
        return target ? findExport(target, local) : { file, client: false };
      }
      continue;
    }
    if (ts.isExportAssignment(stmt) && name === 'default') {
      return { file, client: false };
    }
    if (!hasModifier(stmt, ts.SyntaxKind.ExportKeyword)) continue;
    const isDefault = hasModifier(stmt, ts.SyntaxKind.DefaultKeyword);
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
      if (stmt.name.text === name) return 'type';
      continue;
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name) {
          return { file, client: false };
        }
      }
      continue;
    }
    if (
      (ts.isFunctionDeclaration(stmt) ||
        ts.isClassDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt)) &&
      ((isDefault && name === 'default') || stmt.name?.text === name)
    ) {
      return { file, client: false };
    }
  }
  return null;
}

/** Rule violations of one server module, plus the source modules it imports. */
function checkServerModule(
  mod: Module,
  coreServerExports: Set<string>
): { violations: string[]; next: string[] } {
  const where = relative(PACKAGES, mod.file);
  const violations: string[] = [];
  const next: string[] = [];
  const clientValues = new Set<string>();
  const reactNamespaces = new Set<string>();
  /** Imported server component types (packages, server modules): not serializable. */
  const packageValues = new Set<string>();
  const isComponentName = (name: string) => /^[A-Z][A-Za-z0-9]*[a-z]/.test(name);

  for (const stmt of mod.source.statements) {
    if (
      (ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt)) &&
      stmt.moduleSpecifier &&
      ts.isStringLiteral(stmt.moduleSpecifier)
    ) {
      const spec = stmt.moduleSpecifier.text;
      if (spec.endsWith('.css')) continue;
      const typeOnly = ts.isImportDeclaration(stmt)
        ? Boolean(stmt.importClause?.isTypeOnly)
        : stmt.isTypeOnly;
      if (typeOnly) continue;
      const target = resolveSource(mod.file, spec);
      if (target) {
        next.push(target);
      } else if (!SERVER_PACKAGES.has(spec)) {
        violations.push(`${where}: imports client-side package ${spec}`);
        continue;
      }
      if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue;

      const clause = stmt.importClause;
      const bindings: { imported: string; local: string }[] = [];
      if (clause.name) {
        bindings.push({ imported: 'default', local: clause.name.text });
      }
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          if (spec === 'react') {
            reactNamespaces.add(clause.namedBindings.name.text);
          } else {
            violations.push(`${where}: namespace import of ${spec}`);
          }
        } else {
          for (const el of clause.namedBindings.elements) {
            if (el.isTypeOnly) continue;
            bindings.push({
              imported: (el.propertyName ?? el.name).text,
              local: el.name.text,
            });
          }
        }
      }
      for (const { imported, local } of bindings) {
        if (spec === 'react') {
          if (imported === 'default') reactNamespaces.add(local);
          else if (CLIENT_ONLY_REACT.has(imported)) {
            violations.push(`${where}: imports ${imported} from react`);
          }
          continue;
        }
        if (spec === '@donotdev/core') {
          if (!coreServerExports.has(imported)) {
            violations.push(
              `${where}: ${imported} is not exported by @donotdev/core under react-server`
            );
          }
          if (isComponentName(local)) packageValues.add(local);
          continue;
        }
        if (!target) {
          if (isComponentName(local)) packageValues.add(local);
          continue;
        }
        const found = findExport(target, imported);
        if (found === null) {
          violations.push(`${where}: ${spec} does not export ${imported}`);
        } else if (found !== 'type' && !found.client) {
          if (isComponentName(local)) packageValues.add(local);
        } else if (found !== 'type' && found.client) {
          if (!/^[A-Z][A-Za-z0-9]*$/.test(local) || /^[A-Z0-9_]+$/.test(local)) {
            violations.push(
              `${where}: uses ${imported} from a 'use client' module (${relative(PACKAGES, found.file)}) as a value`
            );
          }
          clientValues.add(local);
        }
      }
    }
  }

  const isComponentFile =
    mod.file.endsWith('.tsx') && !BROWSER_GLOBAL_EXCEPTIONS.has(where);

  // Functions and server component types cannot cross into a client component:
  // module-level functions, arrow/function constants and package imports
  const functionLike = new Set<string>(packageValues);
  for (const stmt of mod.source.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) functionLike.add(stmt.name.text);
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer))
        ) {
          functionLike.add(decl.name.text);
        }
      }
    }
  }
  /** Whether a JSX tag renders on the client (client reference or host element). */
  const isClientTag = (tag: ts.JsxTagNameExpression) =>
    (ts.isIdentifier(tag) && (clientValues.has(tag.text) || /^[a-z]/.test(tag.text)));
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : '';
      if (/^use[A-Z]/.test(name) && !SERVER_HOOKS.has(name)) {
        violations.push(`${where}: calls ${name}()`);
      }
      if (ts.isIdentifier(callee) && clientValues.has(callee.text)) {
        violations.push(`${where}: calls client reference ${callee.text}()`);
      }
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression)
    ) {
      if (clientValues.has(node.expression.text)) {
        violations.push(
          `${where}: dots into client reference ${node.getText()}`
        );
      }
      if (
        reactNamespaces.has(node.expression.text) &&
        CLIENT_ONLY_REACT.has(node.name.text)
      ) {
        violations.push(`${where}: uses ${node.getText()}`);
      }
    }
    if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText())) {
      violations.push(`${where}: sets event handler ${node.name.getText()}`);
    } else if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression
    ) {
      const value = node.initializer.expression;
      const element = node.parent.parent;
      const passesFunction =
        ts.isArrowFunction(value) ||
        ts.isFunctionExpression(value) ||
        (ts.isIdentifier(value) && functionLike.has(value.text));
      if (
        passesFunction &&
        (ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element)) &&
        isClientTag(element.tagName)
      ) {
        violations.push(
          `${where}: passes a function to client component ${element.tagName.getText()} (${node.name.getText()})`
        );
      }
    }
    if (
      isComponentFile &&
      ts.isIdentifier(node) &&
      BROWSER_GLOBALS.has(node.text) &&
      !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) &&
      !ts.isPropertyAssignment(node.parent) &&
      !ts.isPropertySignature(node.parent)
    ) {
      violations.push(`${where}: reads ${node.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(mod.source);
  return { violations, next };
}

/** Every module reached from the entries without crossing `'use client'`. */
async function walkServerGraph() {
  const core = await import('../../../core/server');
  const coreServerExports = new Set(Object.keys(core));
  const seen = new Set<string>();
  const queue = [...RSC_ENTRIES];
  const violations: string[] = [];
  const server: string[] = [];
  const client: string[] = [];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!SOURCE_ROOTS.some((root) => file.startsWith(root))) continue;
    const mod = load(file);
    if (mod.client) {
      client.push(file);
      continue;
    }
    server.push(file);
    const result = checkServerModule(mod, coreServerExports);
    violations.push(...result.violations);
    queue.push(...result.next);
  }
  return { violations, server, client };
}

/** Value export names of a module, `export *` chains followed (relative only). */
function exportNames(file: string, seen = new Set<string>()): string[] {
  if (seen.has(file)) return [];
  seen.add(file);
  const names = new Set<string>();
  for (const stmt of load(file).source.statements) {
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue;
      if (!stmt.exportClause) {
        const spec = (stmt.moduleSpecifier as ts.StringLiteral).text;
        const target = resolveSource(file, spec);
        if (!target) throw new Error(`${file}: export * from package ${spec}`);
        for (const n of exportNames(target, seen)) {
          if (n !== 'default') names.add(n);
        }
      } else if (ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          if (!el.isTypeOnly) names.add(el.name.text);
        }
      }
      continue;
    }
    if (ts.isExportAssignment(stmt)) {
      names.add('default');
      continue;
    }
    if (!hasModifier(stmt, ts.SyntaxKind.ExportKeyword)) continue;
    if (hasModifier(stmt, ts.SyntaxKind.DefaultKeyword)) {
      names.add('default');
    } else if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.add(decl.name.text);
      }
    } else if (
      (ts.isFunctionDeclaration(stmt) ||
        ts.isClassDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt)) &&
      stmt.name
    ) {
      names.add(stmt.name.text);
    }
  }
  return [...names];
}

/**
 * esbuild plugin: every `'use client'` source module becomes a module of client
 * references (registerClientReference per export), like Next's flight loader.
 */
const clientReferences: Plugin = {
  name: 'client-references',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\.css$/ }, (args) => ({
      path: args.path,
      namespace: 'dropped-css',
    }));
    pluginBuild.onLoad({ filter: /.*/, namespace: 'dropped-css' }, () => ({
      contents: '',
      loader: 'js',
    }));
    pluginBuild.onLoad({ filter: /\/packages\/.*\.tsx?$/ }, (args) => {
      if (!load(args.path).client) return undefined;
      const id = relative(PACKAGES, args.path);
      const refs = exportNames(args.path).map((name) => {
        const ref = `registerClientReference(function () { throw new Error(${JSON.stringify(`${id}#${name} called on the server`)}); }, ${JSON.stringify(id)}, ${JSON.stringify(name)})`;
        return name === 'default'
          ? `export default ${ref};`
          : `export const ${name} = ${ref};`;
      });
      return {
        contents: `import { registerClientReference } from 'react-server-dom-webpack/server';\n${refs.join('\n')}\n`,
        loader: 'js',
        resolveDir: PACKAGES,
      };
    });
  },
};

/** i18n config the server translation reads (shape of the generated module). */
const I18N_CONFIG = {
  languages: ['en', 'fr'],
  fallback: 'en',
  eager: ['dndev'],
  mapping: {},
  content: {
    demo: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
  },
};

/** RSC process: renders the tree MODE names to a Flight payload on stdout. */
const RSC_ENTRY = `
import { renderToPipeableStream } from 'react-server-dom-webpack/server';
import { createElement as h } from 'react';
import { Stack, Text, Card } from '@donotdev/components/rsc';
import { PageContainer } from '@donotdev/ui/rsc';
import { setRequestLanguage, useTranslation } from '@donotdev/core/rsc';

globalThis._DNDEV_CONFIG_ = { i18n: ${JSON.stringify(I18N_CONFIG)} };

function Greeting() {
  const { t } = useTranslation('demo');
  return h(Text, { as: 'p' }, t('hello'));
}
function Page() {
  setRequestLanguage('fr');
  return h(Stack, { gap: 'medium' }, h(Text, { as: 'h1' }, 'Title'), h(Greeting));
}
const trees = {
  presentational: h(Stack, { gap: 'medium' }, h(Text, { as: 'h1' }, 'Title'), h(Text, null, 'Body')),
  i18n: h(Page),
  island: h(Stack, null, h(Card, { title: 'Island' })),
  page: h(PageContainer, null, h(Text, null, 'In page')),
};
// Client manifest: every client reference id#name maps to itself (no real chunks)
const clientManifest = new Proxy({}, {
  get: (_, key) => {
    const [id, name] = String(key).split('#');
    return { id, chunks: [], name };
  },
});
renderToPipeableStream(trees[process.env.MODE], clientManifest, {
  onError(error) { console.error(error); process.exitCode = 1; },
}).pipe(process.stdout);
`;

/** SSR process: Flight payload (env FLIGHT) → HTML on stdout (react-dom/server). */
const SSR_ENTRY = `
import { Readable } from 'node:stream';
import { createFromNodeStream } from 'react-server-dom-webpack/client';
import { renderToStaticMarkup } from 'react-dom/server';
const tree = await createFromNodeStream(Readable.from([Buffer.from(process.env.FLIGHT)]), { moduleMap: {}, serverModuleMap: null, moduleLoading: null });
process.stdout.write(renderToStaticMarkup(tree));
`;

/** Next's compiled React files, as Next resolves them in its RSC and SSR graphs. */
const NEXT_REACT: Record<'rsc' | 'ssr', Record<string, string>> = {
  rsc: {
    react: 'react/react.react-server.js',
    'react/jsx-runtime': 'react/jsx-runtime.react-server.js',
    'react/jsx-dev-runtime': 'react/jsx-dev-runtime.react-server.js',
    'react-dom': 'react-dom/react-dom.react-server.js',
    'react-server-dom-webpack/server': 'react-server-dom-webpack/server.node.js',
  },
  ssr: {
    react: 'react/index.js',
    'react/jsx-runtime': 'react/jsx-runtime.js',
    'react-dom': 'react-dom/index.js',
    'react-dom/server': 'react-dom/server.node.js',
    'react-server-dom-webpack/client': 'react-server-dom-webpack/client.node.js',
  },
};

/** esbuild plugin: React imports resolve to Next's compiled copy for `graph`. */
function nextReact(graph: 'rsc' | 'ssr'): Plugin {
  return {
    name: `next-react-${graph}`,
    setup(pluginBuild) {
      // Next's compiled copies require each other as `next/dist/compiled/react`
      pluginBuild.onResolve(
        {
          filter:
            /^(next\/dist\/compiled\/)?(react|react-dom|react-server-dom-webpack)(\/.*)?$/,
        },
        (args) => {
          const name = args.path.replace(/^next\/dist\/compiled\//, '');
          const file = NEXT_REACT[graph][name];
          if (!file) {
            return { errors: [{ text: `No ${graph} mapping for ${args.path}` }] };
          }
          return { path: realpathSync(join(NEXT_COMPILED, file)) };
        }
      );
    },
  };
}

async function bundle(contents: string, graph: 'rsc' | 'ssr') {
  const result = await build({
    stdin: { contents, resolveDir: join(PACKAGES, 'ui'), loader: 'js' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    conditions: graph === 'rsc' ? ['react-server'] : [],
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    external: ['jsdom', 'dompurify'],
    banner: {
      js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
    },
    logLevel: 'silent',
    plugins: graph === 'rsc' ? [nextReact(graph), clientReferences] : [nextReact(graph)],
  });
  return result.outputFiles[0].text;
}

/** Runs an ES module (code on stdin) in Node; externals resolve from packages/components. */
function run(code: string, conditions: string[], env: Record<string, string>) {
  const result = spawnSync(
    'node',
    [...conditions.map((c) => `--conditions=${c}`), '--input-type=module', '-'],
    {
      cwd: join(PACKAGES, 'components'),
      input: code,
      env: { ...process.env, ...env, NODE_ENV: 'production' },
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }
  );
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  return result.stdout;
}

describe('rsc entries (@donotdev/components/rsc, @donotdev/ui/rsc)', () => {
  it('package.json: /rsc is react-server only, the root has no react-server', () => {
    for (const name of ['components', 'ui']) {
      const pkg = JSON.parse(
        readFileSync(join(PACKAGES, name, 'package.json'), 'utf8')
      ) as { exports: Record<string, Record<string, string>> };
      expect(pkg.exports['.']['react-server']).toBeUndefined();
      expect(pkg.exports['./rsc']).toEqual({
        types: './src/rsc.ts',
        'react-server': './src/rsc.ts',
      });
    }
  });

  it.each(['@donotdev/components/rsc', '@donotdev/ui/rsc'])(
    '%s fails to resolve without the react-server condition',
    (specifier) => {
      // Node's own package-exports resolution (no file is loaded)
      const resolve = (conditions: string[]) =>
        spawnSync(
          'node',
          [
            ...conditions.map((c) => `--conditions=${c}`),
            '--input-type=module',
            '-e',
            `console.log(import.meta.resolve(${JSON.stringify(specifier)}))`,
          ],
          { cwd: join(PACKAGES, 'ui'), encoding: 'utf8' }
        );
      const plain = resolve([]);
      expect(plain.status).not.toBe(0);
      expect(plain.stderr).toMatch(/ERR_PACKAGE_PATH_NOT_EXPORTED/);
      const rsc = resolve(['react-server']);
      expect(rsc.status).toBe(0);
      expect(rsc.stdout.trim()).toMatch(/\/src\/rsc\.ts$/);
    }
  );

  it('export the same names as the client barrels', () => {
    for (const name of ['components', 'ui']) {
      const index = exportNames(join(PACKAGES, name, 'src/index.ts')).sort();
      const rsc = exportNames(join(PACKAGES, name, 'src/rsc.ts')).sort();
      expect(rsc).toEqual(index);
    }
  });

  it('server graph: no client API, hook, handler, browser global or client value', async () => {
    const { violations, server, client } = await walkServerGraph();
    expect(violations).toEqual([]);
    // Presentational modules are server modules, interactive ones client boundaries
    const rel = (files: string[]) => files.map((f) => relative(PACKAGES, f));
    expect(rel(server)).toEqual(
      expect.arrayContaining([
        'components/src/atomic/Stack/index.tsx',
        'components/src/atomic/Text/index.tsx',
        'components/src/atomic/Button/index.tsx',
      ])
    );
    expect(rel(client)).toEqual(
      expect.arrayContaining([
        'components/src/atomic/Card/index.tsx',
        'components/src/atomic/Dialog/index.tsx',
        'ui/src/components/layout/PageContainer.tsx',
        'ui/src/routing/404.tsx',
      ])
    );
  }, 60_000);

  describe('RSC render (react-server-dom-webpack, react-server React)', () => {
    let rscCode: string;
    let ssrCode: string;

    const renderFlight = async (mode: string) => {
      rscCode ??= await bundle(RSC_ENTRY, 'rsc');
      return run(rscCode, ['react-server'], { MODE: mode });
    };
    const renderHtml = async (flight: string) => {
      ssrCode ??= await bundle(SSR_ENTRY, 'ssr');
      return run(ssrCode, [], { FLIGHT: flight });
    };

    it('renders presentational components as server components, same HTML as the client barrel', async () => {
      const html = await renderHtml(await renderFlight('presentational'));
      const { Stack, Text } = await import('@donotdev/components');
      const expected = renderToStaticMarkup(
        createElement(
          Stack,
          { gap: 'medium' },
          createElement(Text, { as: 'h1' }, 'Title'),
          createElement(Text, null, 'Body')
        )
      );
      expect(html).toBe(expected);
      expect(html).toContain('Title');
    }, 60_000);

    it('renders an interactive component as a client reference (not run on the server)', async () => {
      const flight = await renderFlight('island');
      // Import row of the client module, referenced by id (`$1`), never rendered here
      expect(flight).toMatch(
        /^(\d+):"components\/src\/atomic\/Card\/index\.tsx"\n\d+:I\["\$\1",\[\],"default"\]/m
      );
    }, 60_000);

    it('renders server children inside a ui client component (PageContainer island)', async () => {
      const flight = await renderFlight('page');
      expect(flight).toMatch(
        /^(\d+):"ui\/src\/components\/layout\/PageContainer\.tsx"\n\d+:I\["\$\1",\[\],"PageContainer"\]/m
      );
      expect(flight).toContain('In page');
    }, 60_000);

    it('translates in server components with the request language (@donotdev/core/rsc)', async () => {
      const html = await renderHtml(await renderFlight('i18n'));
      expect(html).toContain('Bonjour');
      expect(html).not.toContain('hello');
    }, 60_000);
  });
});
