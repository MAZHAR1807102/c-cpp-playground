// Step-through for C, C++ and Java: the program is "instrumented" before it is compiled. Before every statement a
// small block is inserted that prints a record: the line, and the value of every variable in scope (found from the
// tree-sitter syntax tree). Functions report when they are entered and when they return (with the value). The records
// are written to standard output between the characters \x1e and \x1f, so the program's own output stays in order
// around them; parseTrace() splits the two apart and builds the same steps as the Python tracer (python-tracer.js).
// No inserted text contains a line break, and C/C++ code after the helper header starts with "#line 1", so compiler
// messages keep the user's line numbers.
//   instrument(rootNode, lang, source, { vars }) -> { code } | { error }
//   parseTrace(stdoutText)                       -> { steps, out, truncated }

const MAX_STEPS = 1500, MAX_ITEMS = 60, BUDGET = 800;   // steps per run; items per list; values per record
const named = n => n ? n.namedChildren.filter(c => !/comment/.test(c.type)) : [];
const field = (n, f) => n ? n.childForFieldName(f) : null;
const L1 = n => n.startPosition.row + 1;
const L2 = n => n.endPosition.row + 1;
const str = s => '"' + String(s).replace(/[\\"]/g, '\\$&').replace(/[^\x20-\x7e]/g, '?') + '"';

class Edits {
  constructor(src) { this.src = src; this.list = []; this.n = 0; }
  ins(at, text) { this.list.push({ at, end: at, text, o: ++this.n }); }
  // text that closes something opened earlier at the same place goes before what was opened later: "}}" order
  close(at, text) { this.list.push({ at, end: at, text, o: -(++this.n) }); }
  rep(a, b, text) { this.list.push({ at: a, end: b, text, o: ++this.n }); }
  apply() {
    let s = this.src;
    for (const e of [...this.list].sort((x, y) => y.at - x.at || y.o - x.o)) s = s.slice(0, e.at) + e.text + s.slice(e.end);
    return s;
  }
}

/* ================================================================ C and C++ ================================================================ */
// a declarator, unwrapped: the name and the operators on the way to it, outermost first (arr, ptr, ref, fn)
function unwrap(d) {
  const ops = [];
  let cur = d;
  while (cur) {
    switch (cur.type) {
      case 'init_declarator': cur = field(cur, 'declarator'); break;
      case 'identifier': case 'field_identifier': case 'type_identifier': return { name: cur.text, ops };
      case 'array_declarator': ops.push('arr'); cur = field(cur, 'declarator'); break;
      case 'pointer_declarator': ops.push('ptr'); cur = field(cur, 'declarator'); break;
      case 'reference_declarator': ops.push('ref'); cur = named(cur)[0]; break;
      case 'function_declarator': ops.push('fn'); cur = field(cur, 'declarator'); break;
      case 'parenthesized_declarator': cur = named(cur)[0]; break;
      default: return null;
    }
  }
  return null;
}
// the variables a declaration (or parameter, or for-range declarator) introduces
function declVars(node, typeText) {
  const out = [];
  const ds = node.childrenForFieldName('declarator').filter(Boolean);
  for (const d of ds) {
    if (d.type === 'structured_binding_declarator') { for (const id of named(d)) if (id.type === 'identifier') out.push({ name: id.text, ops: [], base: 'auto' }); continue; }
    const u = unwrap(d);
    if (!u || u.ops.includes('fn')) continue;
    out.push({ name: u.name, ops: u.ops.filter(o => o !== 'ref'), base: typeText });
  }
  return out;
}
const typeOf = n => { const t = field(n, 'type'); return t ? t.text : ''; };
const isExtern = n => named(n).some(c => c.type === 'storage_class_specifier' && c.text === 'extern');

/* C: what each type can be printed as */
const C_NUM = /^(unsigned|signed|short|long|int|size_t|ssize_t|u?int(8|16|32|64)_t|u?intptr_t|ptrdiff_t|u?intmax_t|time_t|clock_t|off_t|wchar_t|char16_t|char32_t|float|double)$/;
function cBase(text, ctx, seen = 0) {
  const t = text.replace(/\b(const|volatile|static|register|restrict|inline|extern|_Atomic)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (/^(_Bool|bool)$/.test(t)) return 'bool';
  if (/^(signed |unsigned )?char$/.test(t)) return 'char';
  if (t.split(' ').every(w => C_NUM.test(w))) return 'num';
  if (/^enum\b/.test(t)) return 'num';
  if (/^struct \w+$/.test(t)) return ctx.structs.has(t) ? { struct: t } : null;
  if (ctx.structs.has(t)) return { struct: t };
  if (ctx.enums.has(t)) return 'num';
  const td = ctx.typedefs.get(t);
  if (td && !td.ops.length && seen < 8) return cBase(td.base, ctx, seen + 1);
  return null;
}
// code that prints the C expression e (an lvalue) whose type is base + ops; null if it cannot be printed
function cPrint(e, base, ops, ctx, depth = 0) {
  const last = ops[ops.length - 1], rest = ops.slice(0, -1);
  const b = cBase(base, ctx);
  if (last === 'arr') {
    if (b === 'char' && !rest.length) return `__pg_ca(${e},sizeof(${e}));`;
    const inner = cPrint(`(${e})[__i${depth}]`, base, rest, ctx, depth + 1);
    if (!inner) return null;
    return `{int __n${depth}=(int)(sizeof(${e})/sizeof((${e})[0]));int __i${depth};__pg_lb();for(__i${depth}=0;__i${depth}<__n${depth};__i${depth}++){if(__pg_el(__i${depth}))break;${inner}}__pg_le(__n${depth});}`;
  }
  if (last === 'ptr') return b === 'char' && !rest.length ? `__pg_cs(${e});` : `__pg_p((const void*)(${e}));`;
  if (last) return null;
  if (b === 'num' || b === 'char' || b === 'bool') return `__PGN(${e});`;
  if (b && b.struct) return `__pg_s${ctx.structs.get(b.struct).id}(&(${e}));`;
  return null;
}

/* C++: templates print every type; C arrays are printed with loops (they may be variable-length) */
function cppPrint(e, base, ops, depth = 0) {
  const last = ops[ops.length - 1], rest = ops.slice(0, -1);
  if (last === 'arr') {
    if (/^(const )?(signed |unsigned )?char$/.test(base.trim()) && !rest.length) return `__pg::ca(${e},sizeof(${e}));`;
    return `{int __n${depth}=(int)(sizeof(${e})/sizeof((${e})[0]));__pg::lb();for(int __i${depth}=0;__i${depth}<__n${depth};__i${depth}++){if(__pg::el(__i${depth}))break;${cppPrint(`(${e})[__i${depth}]`, base, rest, depth + 1)}}__pg::le(__n${depth});}`;
  }
  return `__pg::v(${e},${depth});`;
}

const C_PRELUDE = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static char *__pg_b; static size_t __pg_bn, __pg_bc; static long __pg_steps; static int __pg_budget; static char *__pg_rv; static int __pg_rl;
static void __pg_put(const char *s) { size_t k = strlen(s); if (__pg_bn + k + 1 > __pg_bc) { __pg_bc = (__pg_bn + k + 1) * 2 + 256; __pg_b = (char *)realloc(__pg_b, __pg_bc); } memcpy(__pg_b + __pg_bn, s, k + 1); __pg_bn += k; }
static void __pg_js(const char *s, size_t n) { char t[8]; size_t i; for (i = 0; i < n && s[i]; i++) { unsigned char c = (unsigned char)s[i]; if (c == '"' || c == '\\') { t[0] = '\\'; t[1] = (char)c; t[2] = 0; } else if (c < 32) sprintf(t, "\\u%04x", c); else { t[0] = (char)c; t[1] = 0; } __pg_put(t); } }
static void __pg_sv(const char *s, size_t n) { __pg_put("[\"s\",\"\\\""); __pg_js(s, n > 200 ? 200 : n); __pg_put("\\\"\"]"); }
static void __pg_num(const char *s) { __pg_put("[\"n\",\""); __pg_put(s); __pg_put("\"]"); }
static void __pg_i(long long x) { char t[32]; sprintf(t, "%lld", x); __pg_num(t); }
static void __pg_u(unsigned long long x) { char t[32]; sprintf(t, "%llu", x); __pg_num(t); }
static void __pg_f(long double x) { char t[48]; sprintf(t, "%.10g", (double)x); __pg_num(t); }
static void __pg_bo(int x) { __pg_put(x ? "[\"b\",\"true\"]" : "[\"b\",\"false\"]"); }
static void __pg_c(int c) { char t[4]; if (c >= 32 && c < 127) { __pg_put("[\"s\",\"'"); t[0] = (char)c; t[1] = 0; __pg_js(t, 1); __pg_put("'\"]"); } else if (c == '\n') __pg_put("[\"s\",\"'\\\\n'\"]"); else if (c == 0) __pg_put("[\"s\",\"'\\\\0'\"]"); else __pg_i(c); }
#define __PGN(x) _Generic((x), _Bool: __pg_bo, char: __pg_c, signed char: __pg_c, unsigned char: __pg_c, float: __pg_f, double: __pg_f, long double: __pg_f, unsigned short: __pg_u, unsigned int: __pg_u, unsigned long: __pg_u, unsigned long long: __pg_u, default: __pg_i)(x)
static void __pg_p(const void *p) { char t[32]; if (!p) { __pg_put("[\"x\",\"NULL\"]"); return; } sprintf(t, "%p", p); __pg_put("[\"p\",\""); __pg_put(t); __pg_put("\"]"); }
static void __pg_cs(const char *s) { if (!s) { __pg_put("[\"x\",\"NULL\"]"); return; } __pg_sv(s, strlen(s)); }
static void __pg_ca(const char *s, size_t n) { size_t k = 0; while (k < n && s[k]) k++; __pg_sv(s, k); }
static void __pg_stop(void) { fputs("\x1e{\"e\":\"t\"}\x1f", stdout); fflush(stdout); _Exit(0); }
static int __pg_beg(int l) { char t[64]; if (++__pg_steps > ${MAX_STEPS}) __pg_stop(); __pg_bn = 0; __pg_budget = ${BUDGET}; sprintf(t, "\x1e{\"e\":\"l\",\"l\":%d,\"v\":[", l); __pg_put(t); return 1; }
static void __pg_var(const char *n, int first) { if (!first) __pg_put(","); __pg_put("[\""); __pg_put(n); __pg_put("\","); }
static void __pg_ve(void) { __pg_put("]"); }
static void __pg_glob(void) { __pg_put("],\"g\":["); }
static void __pg_end(void) { __pg_put("]}\x1f"); fwrite(__pg_b, 1, __pg_bn, stdout); }
static void __pg_lb(void) { __pg_put("[\"l\",["); }
static int __pg_el(int i) { if (i >= ${MAX_ITEMS} || --__pg_budget < 0) return 1; if (i) __pg_put(","); return 0; }
static void __pg_le(long n) { char t[32]; sprintf(t, "],%ld]", n); __pg_put(t); }
static void __pg_ob(const char *n) { __pg_put("[\"o\",\""); __pg_put(n); __pg_put("\",["); }
static void __pg_oe(void) { __pg_put("]]"); }
static int __pg_enter(const char *f, int l1, int l2) { char t[200]; if (++__pg_steps > ${MAX_STEPS}) __pg_stop(); sprintf(t, "\x1e{\"e\":\"c\",\"l\":%d,\"f\":\"%s\"}\x1f", l1, f); fputs(t, stdout); return l2; }
static void __pg_leave(int *l2) { char t[64]; sprintf(t, "\x1e{\"e\":\"r\",\"l\":%d", __pg_rl ? __pg_rl : *l2); fputs(t, stdout); if (__pg_rv) { fputs(",\"r\":", stdout); fputs(__pg_rv, stdout); free(__pg_rv); __pg_rv = 0; } fputs("}\x1f", stdout); __pg_rl = 0; }
static void __pg_rvb(void) { __pg_bn = 0; __pg_budget = ${BUDGET}; }
static void __pg_rve(int l) { __pg_rv = (char *)malloc(__pg_bn + 1); memcpy(__pg_rv, __pg_b, __pg_bn + 1); __pg_rl = l; }
`;

const CPP_PRELUDE = String.raw`#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <string_view>
#include <type_traits>
#include <iterator>
#include <utility>
#include <vector>
#include <stack>
#include <queue>
namespace __pg {
static long long steps = 0; static int budget = 0, rl = 0; static bool hasrv = false;
static std::string b, rv;
inline void js(const char *s, size_t n) { for (size_t i = 0; i < n; i++) { unsigned char c = (unsigned char)s[i]; if (c == '"' || c == '\\') { b += '\\'; b += (char)c; } else if (c < 32) { char t[8]; snprintf(t, 8, "\\u%04x", c); b += t; } else b += (char)c; } }
inline void sv(const char *s, size_t n) { b += "[\"s\",\"\\\""; js(s, n > 200 ? 200 : n); b += "\\\"\"]"; }
inline void num(const std::string &s) { b += "[\"n\",\""; b += s; b += "\"]"; }
[[noreturn]] inline void stop() { fputs("\x1e{\"e\":\"t\"}\x1f", stdout); fflush(stdout); std::_Exit(0); }
inline bool beg(int l) { if (++steps > ${MAX_STEPS}) stop(); b.clear(); budget = ${BUDGET}; b += "\x1e{\"e\":\"l\",\"l\":"; b += std::to_string(l); b += ",\"v\":["; return true; }
inline void var(const char *n, bool first) { if (!first) b += ','; b += "[\""; b += n; b += "\","; }
inline void ve() { b += ']'; }
inline void glob() { b += "],\"g\":["; }
inline void end() { b += "]}\x1f"; fwrite(b.data(), 1, b.size(), stdout); }
inline void lb() { b += "[\"l\",["; }
inline bool el(long long i) { if (i >= ${MAX_ITEMS} || --budget < 0) return true; if (i) b += ','; return false; }
inline void le(long long n, const char *kind = nullptr) { b += "],"; b += std::to_string(n); if (kind) { b += ",\""; b += kind; b += '"'; } b += ']'; }
inline void ca(const char *s, size_t n) { size_t k = 0; while (k < n && s[k]) k++; sv(s, k); }
inline void ob(const char *n) { b += "[\"o\",\""; b += n; b += "\",["; }
inline void oe() { b += "]]"; }
template<class...> struct vt { using type = void; };
template<class T, class = void> struct is_iter : std::false_type {};
template<class T> struct is_iter<T, typename vt<decltype(std::begin(std::declval<const T &>())), decltype(std::end(std::declval<const T &>()))>::type> : std::true_type {};
template<class T, class = void> struct has_mapped : std::false_type {};
template<class T> struct has_mapped<T, typename vt<typename T::mapped_type>::type> : std::true_type {};
template<class T, class = void> struct has_key : std::false_type {};
template<class T> struct has_key<T, typename vt<typename T::key_type>::type> : std::true_type {};
template<class T, class = void> struct is_adaptor : std::false_type {};
template<class T> struct is_adaptor<T, typename vt<typename T::container_type>::type> : std::true_type {};
template<class T, class = void> struct has_obj : std::false_type {};
template<class T> struct has_obj<T, typename vt<decltype(__pg_obj(std::declval<const T &>(), 0))>::type> : std::true_type {};
template<class T> struct is_pair : std::false_type {};
template<class A, class B> struct is_pair<std::pair<A, B>> : std::true_type {};
template<class T> struct an { static constexpr const char *s = nullptr; };
template<class T, class C> struct an<std::stack<T, C>> { static constexpr const char *s = "stack (top on the right)"; };
template<class T, class C> struct an<std::queue<T, C>> { static constexpr const char *s = "queue (front on the left)"; };
template<class T, class C, class P> struct an<std::priority_queue<T, C, P>> { static constexpr const char *s = "priority_queue (heap order, top first)"; };
template<class A> struct acc : A { static const typename A::container_type &get(const A &a) { return a.*(&acc::c); } };
template<class T> void v(const T &x, int d);
template<class C> void items(const C &x, int d, const char *kind) {
  lb(); long long i = 0, n = 0;
  for (auto it = std::begin(x); it != std::end(x); ++it, ++n) if (i >= 0) { if (el(i)) { i = -1; continue; } v(*it, d + 1); i++; }
  le(n, kind);
}
template<class T> void v(const T &x, int d) {
  typedef typename std::remove_cv<T>::type U;
  if constexpr (std::is_same<U, bool>::value) b += x ? "[\"b\",\"true\"]" : "[\"b\",\"false\"]";
  else if constexpr (std::is_same<U, char>::value || std::is_same<U, signed char>::value || std::is_same<U, unsigned char>::value) {
    int c = (unsigned char)x;
    if (c >= 32 && c < 127) { b += "[\"s\",\"'"; char t[2] = { (char)c, 0 }; js(t, 1); b += "'\"]"; }
    else if (c == '\n') b += "[\"s\",\"'\\\\n'\"]"; else if (c == 0) b += "[\"s\",\"'\\\\0'\"]"; else num(std::to_string(c));
  }
  else if constexpr (std::is_integral<U>::value) { if (std::is_signed<U>::value) num(std::to_string((long long)x)); else num(std::to_string((unsigned long long)x)); }
  else if constexpr (std::is_floating_point<U>::value) { char t[48]; snprintf(t, 48, "%.10g", (double)x); num(t); }
  else if constexpr (std::is_enum<U>::value) num(std::to_string((long long)x));
  else if constexpr (std::is_same<U, std::string>::value || std::is_same<U, std::string_view>::value) sv(x.data(), x.size());
  else if constexpr (std::is_null_pointer<U>::value) b += "[\"x\",\"nullptr\"]";
  else if constexpr (std::is_array<U>::value) {
    if constexpr (std::is_same<typename std::remove_cv<typename std::remove_extent<U>::type>::type, char>::value) ca(x, std::extent<U>::value);
    else { lb(); size_t n = std::extent<U>::value; for (size_t i = 0; i < n; i++) { if (el(i)) break; v(x[i], d + 1); } le(n); }
  }
  else if constexpr (std::is_pointer<U>::value) {
    if (!x) { b += "[\"x\",\"nullptr\"]"; return; }
    if constexpr (std::is_same<typename std::remove_cv<typename std::remove_pointer<U>::type>::type, char>::value) sv(x, strnlen(x, 200));
    else { char t[32]; snprintf(t, 32, "%p", (const void *)x); b += "[\"p\",\""; b += t; b += "\"]"; }
  }
  else if constexpr (is_pair<U>::value) { if (d > 5) { b += "[\"u\",\"...\"]"; return; } b += "[\"l\",["; v(x.first, d + 1); b += ','; v(x.second, d + 1); b += "],2,\"pair\"]"; }
  else if constexpr (std::is_same<U, std::vector<bool>>::value) { lb(); long long i = 0; for (bool e : x) { if (el(i++)) break; v(e, d + 1); } le((long long)x.size()); }
  else if constexpr (has_mapped<U>::value && is_iter<U>::value) {
    if (d > 5) { b += "[\"u\",\"...\"]"; return; }
    b += "[\"m\",["; long long i = 0, n = 0;
    for (auto it = std::begin(x); it != std::end(x); ++it, ++n) if (i >= 0) { if (el(i)) { i = -1; continue; } b += '['; v(it->first, d + 1); b += ','; v(it->second, d + 1); b += ']'; i++; }
    b += "],"; b += std::to_string(n); b += ']';
  }
  else if constexpr (has_key<U>::value && is_iter<U>::value) { if (d > 5) { b += "[\"u\",\"...\"]"; return; } b += "[\"t\",["; long long i = 0, n = 0; for (auto it = std::begin(x); it != std::end(x); ++it, ++n) if (i >= 0) { if (el(i)) { i = -1; continue; } v(*it, d + 1); i++; } b += "],"; b += std::to_string(n); b += ']'; }
  else if constexpr (is_iter<U>::value) { if (d > 5) { b += "[\"u\",\"...\"]"; return; } items(x, d, nullptr); }
  else if constexpr (is_adaptor<U>::value) { if (d > 5) { b += "[\"u\",\"...\"]"; return; } items(acc<U>::get(x), d, an<U>::s); }
  else if constexpr (has_obj<U>::value) { if (d > 4) { b += "[\"u\",\"...\"]"; return; } __pg_obj(x, d); }
  else b += "[\"u\",\"\"]";
}
struct F {
  int l2;
  F(const char *f, int l1, int l2_) : l2(l2_) { if (++steps > ${MAX_STEPS}) stop(); std::string r = "\x1e{\"e\":\"c\",\"l\":" + std::to_string(l1) + ",\"f\":\"" + f + "\"}\x1f"; fwrite(r.data(), 1, r.size(), stdout); }
  ~F() { std::string r = "\x1e{\"e\":\"r\",\"l\":" + std::to_string(rl ? rl : l2); if (hasrv) { r += ",\"r\":"; r += rv; } r += "}\x1f"; fwrite(r.data(), 1, r.size(), stdout); rl = 0; hasrv = false; }
};
template<class T> void retv(const T &x, int l) { std::string s; s.swap(b); budget = ${BUDGET}; v(x, 0); rv.swap(b); b.swap(s); hasrv = true; rl = l; }
template<class T> T &&ret(T &&x, int l) { retv(x, l); return static_cast<T &&>(x); }
inline void retl(int l) { rl = l; }
}
`;

function instrumentC(root, lang, src, withVars) {
  const E = new Edits(src);
  const cpp = lang === 'cpp';
  const ctx = { structs: new Map(), typedefs: new Map(), enums: new Set(), classes: new Map() };
  // the program's own types: typedefs, structs (C: a printer function each; C++: a __pg_obj each), enums
  let sid = 0;
  const top = named(root);
  function fieldsOf(body) {
    const fs = [];
    for (const f of named(body)) {
      if (f.type !== 'field_declaration') continue;
      if (named(f).some(c => c.type === 'storage_class_specifier' && /static/.test(c.text))) continue;
      if (/\b(static|constexpr)\b/.test(f.text.split(/[=;{]/)[0])) continue;
      for (const v of declVars(f, typeOf(f))) fs.push(v);
    }
    return fs;
  }
  const after = n => n.nextSibling && n.nextSibling.type === ';' ? n.nextSibling.endIndex : n.endIndex;
  for (const n of top) {
    const typeNode = n.type === 'type_definition' || n.type === 'declaration' ? field(n, 'type') : (/specifier$/.test(n.type) ? n : null);
    if (n.type === 'type_definition') {
      for (const d of n.childrenForFieldName('declarator').filter(Boolean)) {
        const u = unwrap(d);
        if (u) ctx.typedefs.set(u.name, { base: typeNode ? (typeNode.type === 'struct_specifier' && field(typeNode, 'name') ? 'struct ' + field(typeNode, 'name').text : typeNode.text) : '', ops: u.ops });
      }
    }
    if (typeNode && typeNode.type === 'enum_specifier' && field(typeNode, 'name')) ctx.enums.add('enum ' + field(typeNode, 'name').text);
    if (n.type === 'type_definition' && typeNode && typeNode.type === 'enum_specifier') for (const d of n.childrenForFieldName('declarator').filter(Boolean)) { const u = unwrap(d); if (u) ctx.enums.add(u.name); }
    if (cpp && typeNode && /^(class_specifier|struct_specifier)$/.test(typeNode.type) && field(typeNode, 'body') && field(typeNode, 'name') && field(typeNode, 'name').type === 'type_identifier') {
      // C++: a printer that the templates find by argument-dependent lookup, and a friend declaration so it may read private members
      const name = field(typeNode, 'name').text, body = field(typeNode, 'body');
      const fs = fieldsOf(body);
      ctx.classes.set(name, body);
      E.ins(body.startIndex + 1, `friend void __pg_obj(const ${name}&,int);`);
      E.ins(after(n), `inline void __pg_obj(const ${name}&__o,int __d){__pg::ob(${str(name)});` + fs.map((f, i) => `__pg::var(${str(f.name)},${i === 0});${cppPrint('__o.' + f.name, f.base, f.ops, 1).replace(/__pg::v\(([^;]*),(\d+)\);$/, '__pg::v($1,__d+1);')}__pg::ve();`).join('') + '__pg::oe();}');
    }
    if (!cpp && typeNode && typeNode.type === 'struct_specifier' && field(typeNode, 'body')) {
      const tag = field(typeNode, 'name');
      const keys = [];
      if (tag) keys.push('struct ' + tag.text);
      if (n.type === 'type_definition') for (const d of n.childrenForFieldName('declarator').filter(Boolean)) { const u = unwrap(d); if (u && !u.ops.length) keys.push(u.name); }
      if (!keys.length) continue;
      const id = ++sid, info = { id, ctype: keys[0], fields: fieldsOf(field(typeNode, 'body')) };
      for (const k of keys) ctx.structs.set(k, info);
      const label = keys[keys.length - 1];
      const body = info.fields.map(f => ({ f, code: cPrint('__q->' + f.name, f.base, f.ops, ctx, 1) })).filter(x => x.code);
      E.ins(after(n), `static void __pg_s${id}(const void*__pv){const ${keys[0]}*__q=(const ${keys[0]}*)__pv;__pg_ob(${str(label)});` + body.map((x, i) => `__pg_var(${str(x.f.name)},${i === 0 ? 1 : 0});${x.code}__pg_ve();`).join('') + '__pg_oe();}');
    }
  }
  // global variables, in source order (a function sees the ones declared before it)
  const globals = [];
  for (const n of top) if (n.type === 'declaration' && !isExtern(n)) for (const v of declVars(n, typeOf(n))) globals.push({ ...v, at: n.endIndex });

  const printVar = (v, first) => {
    const code = cpp ? cppPrint(v.name, v.base, v.ops) : cPrint(v.name, v.base, v.ops, ctx);
    if (!code) return '';
    return (cpp ? `__pg::var(${str(v.name)},${first});` : `__pg_var(${str(v.name)},${first ? 1 : 0});`) + code + (cpp ? '__pg::ve();' : '__pg_ve();');
  };
  function traceCode(line, scope, fnGlobals) {
    const P = cpp ? '__pg::' : '__pg_';
    let s = `if(${P}beg(${line})){`;
    if (withVars) {
      const seen = new Set(), out = [];
      for (let i = scope.length - 1; i >= 0; i--) { const v = scope[i]; if (seen.has(v.name)) continue; seen.add(v.name); out.unshift(v); }
      let first = true;
      for (const v of out) { const c = printVar(v, first); if (c) { s += c; first = false; } }
      s += `${P}glob();`;
      first = true;
      for (const g of fnGlobals) if (!seen.has(g.name)) { const c = printVar(g, first); if (c) { s += c; first = false; } }
    } else s += `${P}glob();`;
    return s + `${P}end();}`;
  }

  // every function with a body
  const fns = [];
  (function walk(n, cls) {
    for (const c of named(n)) {
      if (c.type === 'function_definition') fns.push({ node: c, cls });
      else if (/^(class_specifier|struct_specifier|union_specifier)$/.test(c.type)) { const b = field(c, 'body'), nm = field(c, 'name'); if (b) walk(b, nm && nm.type === 'type_identifier' ? nm.text : ''); }
      else if (/^(namespace_definition|linkage_specification|template_declaration|declaration_list|field_declaration_list|declaration|field_declaration)$/.test(c.type)) walk(c, cls);
    }
  })(root, '');

  for (const { node: fn, cls } of fns) {
    const body = field(fn, 'body');
    if (!body || body.type !== 'compound_statement') continue;
    const head = src.slice(fn.startIndex, body.startIndex);
    if (/\b(constexpr|consteval)\b/.test(head) || /\bco_(return|yield|await)\b/.test(body.text)) continue;
    // the function's name, its parameters, and its return type
    let d = field(fn, 'declarator'); const retOps = [];
    while (d && d.type !== 'function_declarator') { if (d.type === 'pointer_declarator') retOps.push('ptr'); else if (d.type === 'reference_declarator') retOps.push('ref'); d = d.type === 'reference_declarator' || d.type === 'parenthesized_declarator' ? named(d)[0] : field(d, 'declarator'); }
    if (!d) continue;
    const idNode = field(d, 'declarator');
    const fullName = idNode ? idNode.text.replace(/\s+/g, '') : '?';
    const shortName = fullName.split('::').pop();
    const retType = typeOf(fn);
    const isVoid = (!retType || /^\s*void\s*$/.test(retType)) && !retOps.length;
    const scope = [];
    for (const p of named(field(d, 'parameters'))) {
      if (p.type !== 'parameter_declaration' && p.type !== 'optional_parameter_declaration') continue;
      for (const v of declVars(p, typeOf(p))) {
        // an array parameter is really a pointer
        const ops = v.ops.slice(); if (ops[ops.length - 1] === 'arr') ops[ops.length - 1] = 'ptr';
        scope.push({ ...v, ops });
      }
    }
    const owner = cls || (fullName.includes('::') ? fullName.split('::').slice(-2, -1)[0] : '');
    if (cpp && owner && ctx.classes.has(owner) && !/\bstatic\b/.test(head)) {
      const decl = cls ? '' : ctx.classes.get(owner).text;
      if (cls || !new RegExp('\\bstatic\\b[^;{}]*\\b' + shortName + '\\s*\\(').test(decl)) scope.push({ name: 'this', ops: [], base: owner, expr: '*this' });
    }
    const fnGlobals = globals.filter(g => g.at <= fn.startIndex);
    const l1 = L1(fn), l2 = L2(fn);
    E.ins(body.startIndex + 1, cpp ? `__pg::F __pgf(${str(shortName)},${l1},${l2});` : `int __pg_fr __attribute__((cleanup(__pg_leave)))=__pg_enter(${str(shortName)},${l1},${l2});`);
    const thisFix = s => s.replace(/__pg::v\(this,0\);/g, '__pg::v(*this,0);');
    const trace = (line, sc) => thisFix(traceCode(line, sc, fnGlobals));

    const block = (b, sc, loopLine) => {
      const mark = sc.length;
      if (loopLine) E.ins(b.startIndex + 1, trace(loopLine, sc));
      for (const s of named(b)) stmt(s, sc);
      sc.length = mark;
    };
    const bodyOf = (n, sc, loopLine) => {
      if (!n) return;
      if (n.type === 'compound_statement') return block(n, sc, loopLine);
      E.ins(n.startIndex, '{' + (loopLine ? trace(loopLine, sc) : ''));
      const mark = sc.length;
      stmt(n, sc);
      sc.length = mark;
      E.close(n.endIndex, '}');
    };
    const condVars = (cond, sc) => {
      if (!cond) return;
      for (const c of named(cond)) if (c.type === 'declaration' || c.type === 'init_statement') for (const v of declVars(c.type === 'declaration' ? c : named(c)[0] || c, typeOf(c.type === 'declaration' ? c : named(c)[0] || c))) sc.push(v);
      const init = field(cond, 'initializer');
      if (init && init.type === 'declaration') for (const v of declVars(init, typeOf(init))) sc.push(v);
      if (cond.type === 'declaration') for (const v of declVars(cond, typeOf(cond))) sc.push(v);
    };
    function stmt(s, sc) {
      if (s.type === 'compound_statement') return block(s, sc);
      if (/^preproc|^comment$/.test(s.type) || s.type === ';') return;
      if (s.type === 'labeled_statement') { const inner = named(s).filter(c => c.type !== 'statement_identifier').pop(); if (inner) stmt(inner, sc); return; }
      if (s.type === 'case_statement') { const v = field(s, 'value'); for (const c of named(s)) if (!v || c.id !== v.id) stmt(c, sc); return; }
      if (s.type === 'expression_statement' && !named(s).length) return;
      E.ins(s.startIndex, trace(L1(s), sc));
      switch (s.type) {
        case 'declaration': for (const v of declVars(s, typeOf(s))) sc.push(v); break;
        case 'if_statement': {
          const mark = sc.length;
          condVars(field(s, 'condition'), sc);
          bodyOf(field(s, 'consequence'), sc);
          let alt = field(s, 'alternative');
          if (alt && alt.type === 'else_clause') alt = named(alt)[0];
          if (alt) bodyOf(alt, sc);
          sc.length = mark;
          break;
        }
        case 'while_statement': { const mark = sc.length; condVars(field(s, 'condition'), sc); bodyOf(field(s, 'body'), sc, L1(s)); sc.length = mark; break; }
        case 'do_statement': bodyOf(field(s, 'body'), sc); break;
        case 'for_statement': {
          const mark = sc.length, init = field(s, 'initializer');
          if (init && init.type === 'declaration') for (const v of declVars(init, typeOf(init))) sc.push(v);
          bodyOf(field(s, 'body'), sc, L1(s));
          sc.length = mark;
          break;
        }
        case 'for_range_loop': {
          const mark = sc.length;
          const dn = field(s, 'declarator');
          if (dn) { if (dn.type === 'structured_binding_declarator') { for (const id of named(dn)) if (id.type === 'identifier') sc.push({ name: id.text, ops: [], base: 'auto' }); } else { const u = unwrap(dn); if (u) sc.push({ name: u.name, ops: u.ops.filter(o => o !== 'ref'), base: typeOf(s) }); } }
          bodyOf(field(s, 'body'), sc, L1(s));
          sc.length = mark;
          break;
        }
        case 'switch_statement': { const mark = sc.length; condVars(field(s, 'condition'), sc); const b = field(s, 'body'); if (b) for (const c of named(b)) stmt(c, sc); sc.length = mark; break; }
        case 'try_statement': {
          bodyOf(field(s, 'body'), sc);
          for (const c of named(s)) if (c.type === 'catch_clause') { const mark = sc.length; for (const p of named(field(c, 'parameters'))) if (p.type === 'parameter_declaration') for (const v of declVars(p, typeOf(p))) sc.push(v); bodyOf(field(c, 'body'), sc); sc.length = mark; }
          break;
        }
        case 'return_statement': {
          const x = named(s)[0], line = L1(s);
          if (!x || isVoid) { E.ins(s.startIndex, cpp ? `{__pg::retl(${line});` : `{__pg_rl=${line};`); E.close(s.endIndex, '}'); break; }
          if (cpp) {
            if (x.type === 'initializer_list' || /^decltype/.test(retType.trim())) { E.ins(s.startIndex, `{__pg::retl(${line});`); E.close(s.endIndex, '}'); }
            else if (x.type === 'identifier') { E.ins(s.startIndex, `{__pg::retv(${x.text},${line});`); E.close(s.endIndex, '}'); }
            else { E.ins(x.startIndex, '__pg::ret(('); E.close(x.endIndex, `),${line})`); }
          } else {
            const pr = withVars ? cPrint('__pgr', retType, retOps, ctx) : null;
            if (!pr) { E.ins(s.startIndex, `{__pg_rl=${line};`); E.close(s.endIndex, '}'); }
            else { E.ins(x.startIndex, '({__auto_type __pgr=('); E.close(x.endIndex, `);__pg_rvb();${pr}__pg_rve(${line});__pgr;})`); }
          }
          break;
        }
      }
    }
    block(body, scope);
  }
  // output order: cout is kept in step with printf, so the records land in the right places
  if (cpp) for (const m of src.matchAll(/sync_with_stdio\s*\(\s*(false|0)\s*\)/g)) E.rep(m.index, m.index + m[0].length, 'sync_with_stdio(true)');
  const code = E.apply();
  return { code: (cpp ? CPP_PRELUDE : C_PRELUDE) + '#line 1\n' + code };
}

/* ================================================================ Java ================================================================ */
const JAVA_HELPERS = String.raw`
final class __PG {
  static int steps = 0, budget = 0, rl = 0; static String rv = null; static StringBuilder b = new StringBuilder();
  static void js(String s) { int n = Math.min(s.length(), 200); for (int i = 0; i < n; i++) { char c = s.charAt(i); if (c == '"' || c == '\\') b.append('\\').append(c); else if (c < 32) { String h = Integer.toHexString(c); b.append("\\u"); for (int k = h.length(); k < 4; k++) b.append('0'); b.append(h); } else b.append(c); } }
  static void sv(String s) { b.append("[\"s\",\"\\\""); js(s); b.append("\\\"\"]"); }
  static void num(String s) { b.append("[\"n\",\"").append(s).append("\"]"); }
  static void stop() { System.out.print("\u001e{\"e\":\"t\"}\u001f"); System.out.flush(); throw new __PGStop(); }
  static boolean beg(int l) { if (++steps > ${MAX_STEPS}) stop(); b.setLength(0); budget = ${BUDGET}; b.append("\u001e{\"e\":\"l\",\"l\":").append(l).append(",\"v\":["); return true; }
  static void var(String n, boolean first) { if (!first) b.append(','); b.append("[\"").append(n).append("\","); }
  static void ve() { b.append(']'); }
  static void glob() { b.append("],\"g\":["); }
  static void end() { b.append("]}\u001f"); System.out.print(b.toString()); }
  static void enter(String f, int l) { if (++steps > ${MAX_STEPS}) stop(); System.out.print("\u001e{\"e\":\"c\",\"l\":" + l + ",\"f\":\"" + f + "\"}\u001f"); }
  static void leave(int l2) { StringBuilder r = new StringBuilder("\u001e{\"e\":\"r\",\"l\":"); r.append(rl != 0 ? rl : l2); if (rv != null) r.append(",\"r\":").append(rv); r.append("}\u001f"); System.out.print(r.toString()); rv = null; rl = 0; }
  static void ret(Object x, int l) { StringBuilder save = b; b = new StringBuilder(); budget = ${BUDGET}; v(x, 0); rv = b.toString(); b = save; rl = l; }
  static void rl(int l) { rl = l; }
  static void ob(String n) { b.append("[\"o\",\"").append(n).append("\",["); }
  static void oe() { b.append("]]"); }
  static void lb() { b.append("[\"l\",["); }
  static boolean el(int i) { if (i >= ${MAX_ITEMS} || --budget < 0) return true; if (i > 0) b.append(','); return false; }
  static void le(int n, String kind) { b.append("],").append(n); if (kind != null) b.append(",\"").append(kind).append('"'); b.append(']'); }
  static void ch(char c) { if (c >= 32 && c < 127) { b.append("[\"s\",\"'"); js(String.valueOf(c)); b.append("'\"]"); } else if (c == '\n') b.append("[\"s\",\"'\\\\n'\"]"); else num(String.valueOf((int) c)); }
  static void v(Object x, int d) {
    if (x == null) { b.append("[\"x\",\"null\"]"); return; }
    if (x instanceof Integer || x instanceof Long || x instanceof Short || x instanceof Byte || x instanceof Double || x instanceof Float) { num(String.valueOf(x)); return; }
    if (x instanceof Boolean) { b.append("[\"b\",\"").append(x).append("\"]"); return; }
    if (x instanceof Character) { ch(((Character) x).charValue()); return; }
    if (x instanceof CharSequence) { sv(x.toString()); return; }
    if (d > 5) { b.append("[\"u\",\"...\"]"); return; }
    if (x instanceof int[]) { int[] a = (int[]) x; lb(); for (int i = 0; i < a.length; i++) { if (el(i)) break; num(String.valueOf(a[i])); } le(a.length, null); return; }
    if (x instanceof long[]) { long[] a = (long[]) x; lb(); for (int i = 0; i < a.length; i++) { if (el(i)) break; num(String.valueOf(a[i])); } le(a.length, null); return; }
    if (x instanceof double[]) { double[] a = (double[]) x; lb(); for (int i = 0; i < a.length; i++) { if (el(i)) break; num(String.valueOf(a[i])); } le(a.length, null); return; }
    if (x instanceof float[]) { float[] a = (float[]) x; lb(); for (int i = 0; i < a.length; i++) { if (el(i)) break; num(String.valueOf(a[i])); } le(a.length, null); return; }
    if (x instanceof short[]) { short[] a = (short[]) x; lb(); for (int i = 0; i < a.length; i++) { if (el(i)) break; num(String.valueOf(a[i])); } le(a.length, null); return; }
    if (x instanceof byte[]) { byte[] a = (byte[]) x; lb(); for (int i = 0; i < a.length; i++) { if (el(i)) break; num(String.valueOf(a[i])); } le(a.length, null); return; }
    if (x instanceof char[]) { char[] a = (char[]) x; lb(); for (int i = 0; i < a.length; i++) { if (el(i)) break; ch(a[i]); } le(a.length, null); return; }
    if (x instanceof boolean[]) { boolean[] a = (boolean[]) x; lb(); for (int i = 0; i < a.length; i++) { if (el(i)) break; b.append("[\"b\",\"").append(a[i]).append("\"]"); } le(a.length, null); return; }
    if (x instanceof Object[]) { Object[] a = (Object[]) x; lb(); for (int i = 0; i < a.length; i++) { if (el(i)) break; v(a[i], d + 1); } le(a.length, null); return; }
    if (x instanceof java.util.Map) { java.util.Map<?, ?> m = (java.util.Map<?, ?>) x; b.append("[\"m\",["); int i = 0; for (java.util.Map.Entry<?, ?> e : m.entrySet()) { if (el(i++)) break; b.append('['); v(e.getKey(), d + 1); b.append(','); v(e.getValue(), d + 1); b.append(']'); } b.append("],").append(m.size()).append(']'); return; }
    if (x instanceof java.util.Set) { java.util.Set<?> s = (java.util.Set<?>) x; b.append("[\"t\",["); int i = 0; for (Object e : s) { if (el(i++)) break; v(e, d + 1); } b.append("],").append(s.size()).append(']'); return; }
    if (x instanceof java.util.Collection) {
      java.util.Collection<?> c = (java.util.Collection<?>) x; lb(); int i = 0; for (Object e : c) { if (el(i++)) break; v(e, d + 1); }
      le(c.size(), x instanceof java.util.PriorityQueue ? "PriorityQueue (heap order, head first)" : x instanceof java.util.Deque ? "Deque (head on the left)" : x instanceof java.util.Queue ? "Queue (head on the left)" : null); return;
    }
    if (x instanceof __PGObj) { ((__PGObj) x).__pgDump(d); return; }
    // other objects: their own text, but "pkg.Class@1b6d3586" (no toString of its own) becomes just "Class"
    String s = x instanceof java.util.Scanner ? "Scanner" : String.valueOf(x);
    int at = s.lastIndexOf('@');
    if (at > 0 && at < s.length() - 1) { boolean hex = true; for (int i = at + 1; i < s.length(); i++) if (Character.digit(s.charAt(i), 16) < 0) hex = false; if (hex) { s = s.substring(0, at); s = s.indexOf("lambda") >= 0 || s.indexOf("$$") >= 0 ? "lambda" : s.substring(Math.max(s.lastIndexOf('.'), s.lastIndexOf('$')) + 1); } }
    b.append("[\"u\",\""); js(s.length() > 80 ? s.substring(0, 80) + "..." : s); b.append("\"]");
  }
}
interface __PGObj { void __pgDump(int d); }
final class __PGStop extends Error { __PGStop() { super("__PG_STOP__"); } }
`;
const JAVA_PRIM_DEFAULT = { int: '0', long: '0L', short: '(short)0', byte: '(byte)0', char: "'\\0'", float: '0f', double: '0.0', boolean: 'false' };

function instrumentJava(root, src, withVars) {
  const E = new Edits(src);
  const jvar = (name, expr, first) => `__PG.var(${str(name)},${first});__PG.v(${expr},0);__PG.ve();`;
  const varsOf = (decl) => named(decl).filter(c => c.type === 'variable_declarator').map(c => field(c, 'name')).filter(Boolean).map(n => n.text);
  const methods = [];
  (function walk(n, chain) {
    for (const c of named(n)) {
      if (/^(class_declaration|record_declaration|enum_declaration|interface_declaration)$/.test(c.type)) {
        const nm = field(c, 'name'), b = field(c, 'body');
        if (!b || !nm) continue;
        const ch = [...chain, nm.text];
        const statics = [], fields = [];
        for (const f of named(b)) {
          if (f.type !== 'field_declaration' && f.type !== 'constant_declaration') continue;
          const mods = named(f).find(k => k.type === 'modifiers');
          const isStatic = (mods && /\bstatic\b/.test(mods.text)) || c.type === 'interface_declaration' || f.type === 'constant_declaration';
          for (const v of varsOf(f)) (isStatic ? statics : fields).push(v);
        }
        if (c.type === 'record_declaration') for (const p of named(field(c, 'parameters'))) { const pn = field(p, 'name'); if (pn) fields.push(pn.text); }
        // objects of this class can print their own fields
        if (c.type === 'class_declaration' || c.type === 'record_declaration') {
          const itf = field(c, 'interfaces');
          if (itf) E.ins(itf.endIndex, ', __PGObj'); else E.ins(b.startIndex, ' implements __PGObj ');
          E.ins(b.startIndex + 1, `public void __pgDump(int __d){__PG.ob(${str(nm.text)});` + fields.map((f, i) => `__PG.var(${str(f)},${i === 0});__PG.v(this.${f},__d+1);__PG.ve();`).join('') + '__PG.oe();}');
        }
        const cls = { chain: ch, statics, iface: c.type === 'interface_declaration' };
        for (const m of named(b)) if (m.type === 'method_declaration' || m.type === 'constructor_declaration' || m.type === 'compact_constructor_declaration') methods.push({ m, cls });
        walk(b, ch);
      } else if (/^(class_body|enum_body|enum_body_declarations|interface_body|record_body)$/.test(c.type)) walk(c, chain);
    }
  })(root, []);

  for (const { m, cls } of methods) {
    const body = field(m, 'body');
    if (!body) continue;
    const mods = named(m).find(k => k.type === 'modifiers');
    const isStatic = !!(mods && /\bstatic\b/.test(mods.text));
    const nm = field(m, 'name');
    const name = nm ? nm.text : cls.chain[cls.chain.length - 1];
    const tNode = field(m, 'type');
    const retType = m.type === 'method_declaration' && tNode ? tNode.text : 'void';
    const dims = field(m, 'dimensions');
    const isVoid = retType === 'void';
    const scope = [];
    for (const p of named(field(m, 'parameters'))) { const pn = field(p, 'name') || named(p).find(k => k.type === 'variable_declarator' && field(k, 'name')); if (pn) scope.push(pn.type === 'identifier' ? pn.text : field(pn, 'name').text); }
    if (!isStatic && !cls.iface) scope.push('this');
    const statics = cls.statics.map(s => ({ name: s, expr: cls.chain.join('.') + '.' + s }));
    const l1 = L1(m), l2 = L2(m);
    const trace = (line, sc) => {
      let s = `if(__PG.beg(${line})){`;
      if (withVars) {
        const seen = new Set(), out = [];
        for (let i = sc.length - 1; i >= 0; i--) if (!seen.has(sc[i])) { seen.add(sc[i]); out.unshift(sc[i]); }
        out.forEach((v, i) => { s += jvar(v, v, i === 0); });
        s += '__PG.glob();';
        statics.filter(g => !seen.has(g.name)).forEach((g, i) => { s += jvar(g.name, g.expr, i === 0); });
      } else s += '__PG.glob();';
      return s + '__PG.end();}';
    };
    // enter at the start (after this(...) / super(...)), leave in a finally block
    const kids = named(body);
    const first = kids[0] && kids[0].type === 'explicit_constructor_invocation' ? kids[0] : null;
    E.ins(first ? first.endIndex : body.startIndex + 1, `__PG.enter(${str(name)},${l1});try{`);
    E.close(body.endIndex - 1, `}finally{__PG.leave(${l2});}`);

    const block = (b, sc, loopLine, skipFirst) => {
      const mark = sc.length;
      if (loopLine) E.ins(b.startIndex + 1, trace(loopLine, sc));
      for (const s of named(b)) if (s !== skipFirst) stmt(s, sc);
      sc.length = mark;
    };
    const bodyOf = (n, sc, loopLine) => {
      if (!n) return;
      if (n.type === 'block') return block(n, sc, loopLine);
      E.ins(n.startIndex, '{' + (loopLine ? trace(loopLine, sc) : ''));
      const mark = sc.length;
      stmt(n, sc);
      sc.length = mark;
      E.close(n.endIndex, '}');
    };
    function localDecl(s, sc) {
      // every local gets a starting value, so reading it in a step is allowed (javac's definite assignment)
      const t = field(s, 'type'), tt = t ? t.text : '';
      for (const d of named(s).filter(c => c.type === 'variable_declarator')) {
        const n = field(d, 'name');
        if (!n) continue;
        if (!field(d, 'value') && withVars && tt !== 'var') {
          const dimsHere = field(d, 'dimensions');
          E.ins(d.endIndex, ' = ' + (!dimsHere && JAVA_PRIM_DEFAULT[tt] || 'null'));
          const mods = named(s).find(k => k.type === 'modifiers');
          if (mods) for (const mm of mods.text.matchAll(/\bfinal\b/g)) E.rep(mods.startIndex + mm.index, mods.startIndex + mm.index + 5, '     ');
        }
        sc.push(n.text);
      }
    }
    function stmt(s, sc, traced) {
      if (s.type === 'block' && !traced) return block(s, sc);
      if (s.type === ';' || s.type === 'explicit_constructor_invocation') return;
      // "outer: for (...)": the step goes before the label, so that the label still names the loop (continue outer)
      if (s.type === 'labeled_statement') { E.ins(s.startIndex, trace(L1(s), sc)); const inner = named(s).filter(c => c.type !== 'identifier').pop(); if (inner) stmt(inner, sc, true); return; }
      if (/^(local_class_declaration|class_declaration|record_declaration|enum_declaration|interface_declaration)$/.test(s.type)) return;
      if (s.type === 'block') return block(s, sc);
      if (!traced) E.ins(s.startIndex, trace(L1(s), sc));
      switch (s.type) {
        case 'local_variable_declaration': localDecl(s, sc); break;
        case 'if_statement': bodyOf(field(s, 'consequence'), sc); if (field(s, 'alternative')) bodyOf(field(s, 'alternative'), sc); break;
        case 'while_statement': bodyOf(field(s, 'body'), sc, L1(s)); break;
        case 'do_statement': bodyOf(field(s, 'body'), sc); break;
        case 'for_statement': {
          const mark = sc.length;
          for (const i of s.childrenForFieldName('init').filter(Boolean)) if (i.type === 'local_variable_declaration') for (const v of varsOf(i)) sc.push(v);
          bodyOf(field(s, 'body'), sc, L1(s));
          sc.length = mark;
          break;
        }
        case 'enhanced_for_statement': { const mark = sc.length; const n = field(s, 'name'); if (n) sc.push(n.text); bodyOf(field(s, 'body'), sc, L1(s)); sc.length = mark; break; }
        case 'switch_expression': case 'switch_statement': {
          const b = field(s, 'body'), mark = sc.length;
          for (const g of named(b)) {
            if (g.type === 'switch_block_statement_group') { for (const c of named(g)) if (c.type !== 'switch_label') stmt(c, sc); }
            else if (g.type === 'switch_rule') { const rb = named(g).filter(c => c.type !== 'switch_label').pop(); if (rb) { if (rb.type === 'block') block(rb, sc); else if (rb.type === 'expression_statement' || rb.type === 'throw_statement') bodyOf(rb, sc); } }
          }
          sc.length = mark;
          break;
        }
        case 'try_statement': case 'try_with_resources_statement': {
          const mark = sc.length;
          const res = field(s, 'resources');
          if (res) for (const r of named(res)) { const n = field(r, 'name'); if (n) sc.push(n.text); }
          bodyOf(field(s, 'body'), sc);
          sc.length = mark;
          for (const c of named(s)) {
            if (c.type === 'catch_clause') { const p = named(c).find(k => k.type === 'catch_formal_parameter'); const pn = p && field(p, 'name'); const mk = sc.length; if (pn) sc.push(pn.text); bodyOf(field(c, 'body'), sc); sc.length = mk; }
            if (c.type === 'finally_clause') { const fb = named(c).find(k => k.type === 'block'); if (fb) bodyOf(fb, sc); }
          }
          break;
        }
        case 'synchronized_statement': bodyOf(field(s, 'body') || named(s).pop(), sc); break;
        case 'return_statement': {
          const x = named(s)[0], line = L1(s);
          if (!x || isVoid || dims) { E.ins(s.startIndex, `{__PG.rl(${line});`); E.close(s.endIndex, '}'); break; }
          // return X;  ->  {T __pgr=(X);__PG.ret(__pgr,line);return __pgr;}
          const kw = s.child(0);
          E.rep(kw.startIndex, kw.endIndex, `{${retType} __pgr=(`);
          E.close(x.endIndex, `);__PG.ret(__pgr,${line});return __pgr`);
          E.close(s.endIndex, '}');
          break;
        }
      }
    }
    block(body, scope, 0, first);
  }
  return { code: E.apply() + JAVA_HELPERS };
}

export function instrument(root, lang, src, opts = {}) {
  const withVars = opts.vars !== false;
  if (lang === 'java') return instrumentJava(root, src, withVars);
  return instrumentC(root, lang, src, withVars);
}

/* ================================================================ the records -> steps ================================================================ */
// Values arrive as ["n","5"], ["s","\"hi\""], ["b","true"], ["x","null"], ["p","0x10"], ["u","text"],
// ["l",[...],length,label?], ["t",[...],length] (a set), ["m",[[k,v],...],length] (a map), ["o","Name",[[field,value],...]].
// They become the Python tracer's form: plain values inline, containers in a heap by id.
export function parseTrace(text) {
  const steps = [], frames = [];
  let out = '', globals = [], k = 0, truncated = false, i = 0;
  function conv(x, heap) {
    if (!Array.isArray(x)) return ['u', ''];
    const t = x[0];
    if (t === 'n' || t === 's' || t === 'b' || t === 'x' || t === 'p' || t === 'u') return [t, String(x[1] ?? '')];
    const id = Object.keys(heap).length + 1;
    heap[id] = null;
    if (t === 'l') heap[id] = ['list', (x[1] || []).map(e => conv(e, heap)), x[2] ?? (x[1] || []).length, x[3] || 'list'];
    else if (t === 't') heap[id] = ['set', (x[1] || []).map(e => conv(e, heap)), x[2] ?? (x[1] || []).length, 'set'];
    else if (t === 'm') heap[id] = ['dict', (x[1] || []).map(([a, b]) => [conv(a, heap), conv(b, heap)]), x[2] ?? (x[1] || []).length, 'dict'];
    else if (t === 'o') heap[id] = ['obj', x[1], (x[2] || []).map(([a, b]) => [a, conv(b, heap)])];
    else heap[id] = ['other', String(t), ''];
    return ['r', id];
  }
  function push(ev, l, rv) {
    const heap = {};
    const st = [];
    if (globals.length) st.push({ n: 'Global', k: 0, ln: l, v: globals.map(([n, x]) => [n, conv(x, heap)]) });
    for (const f of frames) st.push({ n: f.n, k: f.k, ln: f.ln, v: f.v.map(([n, x]) => [n, conv(x, heap)]) });
    const step = { l, ev, st, h: heap, o: out.length };
    if (rv !== undefined) step.rv = conv(rv, heap);
    steps.push(step);
  }
  while (i < text.length) {
    const a = text.indexOf('\x1e', i);
    if (a < 0) { out += text.slice(i); break; }
    out += text.slice(i, a);
    const z = text.indexOf('\x1f', a);
    if (z < 0) break;
    let r = null;
    try { r = JSON.parse(text.slice(a + 1, z)); } catch (_) { /* a damaged record is skipped */ }
    i = z + 1;
    if (!r) continue;
    if (r.e === 't') { truncated = true; break; }
    if (r.e === 'c') { frames.push({ n: r.f, k: ++k, ln: r.l, v: [] }); push('call', r.l); }
    else if (r.e === 'l') { const f = frames[frames.length - 1]; if (f) { f.v = r.v || []; f.ln = r.l; } if (r.g) globals = r.g; push('line', r.l); }
    else if (r.e === 'r') { const f = frames[frames.length - 1]; if (f) f.ln = r.l; push('return', r.l, r.r); frames.pop(); }
  }
  return { steps, out, truncated };
}
