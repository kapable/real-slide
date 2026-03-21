# Bundle Analysis Report

**Generated:** 2026-03-21

## Summary

| Metric | Value |
|--------|-------|
| Total Static Size | ~2.2MB |
| Total JS Chunks | 76 files |
| Largest Chunk | 394KB |

## Large Dependencies (>50KB)

### Client-side Libraries

| Package | Size | Notes |
|---------|------|-------|
| **lucide-react** | ~45MB (node_modules) | Icon library - only imports used are bundled via tree-shaking |
| **@radix-ui/** | ~3.7MB (node_modules) | Multiple UI primitives - tree-shaken |
| **recharts** | ~2.5MB (node_modules) | Charting library - imports optimized |
| **@supabase/supabase-js** | ~1.5MB (node_modules) | Database client |

### Largest JS Chunks

| Chunk | Size | Likely Contents |
|-------|------|-----------------|
| `2459-*.js` | 394KB | Admin/Charts (recharts heavy) |
| `3794-*.js` | 217KB | Presenter page components |
| `4bd1b696-*.js` | 195KB | Shared UI components |
| `407-*.js` | 191KB | Form/Dialog components |
| `framework-*.js` | 185KB | React framework |
| `main-*.js` | 134KB | Main app bundle |
| `polyfills-*.js` | 110KB | Browser polyfills |

## Duplicate Dependencies

**Status:** ✅ No significant duplicates found

Running `npm dedupe --dry-run` showed no critical duplicates. The packages that would be added are platform-specific bindings that don't affect bundle size.

## Tree-Shaking Effectiveness

### Good Tree-Shaking

1. **lucide-react** - Only imports used are bundled (~10-20KB actual)
2. **@radix-ui** - Individual packages imported, well tree-shaken
3. **recharts** - Optimized via `optimizePackageImports` in next.config.js

### Optimization Applied

```js
// next.config.js
experimental: {
  optimizePackageImports: ['recharts', 'lucide-react'],
}
```

## Recommendations

### High Priority

1. ✅ **Recharts optimization** - Already using `optimizePackageImports`
2. ✅ **Dynamic imports** - Charts loaded on-demand
3. ✅ **Lucide icons** - Tree-shaking working correctly

### Medium Priority

1. **Consider lighter chart library** - Recharts is ~200KB in bundle
   - Alternative: [Nivo](https://nivo.rocks/) (smaller bundles per chart type)
   - Alternative: [Visx](https://airbnb.io/visx/) (modular)

2. **Supabase client** - Already minimal, loaded per-page

3. **Admin pages** - Already lazy-loaded

### Low Priority

1. **Polyfills** - Consider reducing if targeting modern browsers only
2. **Framework size** - React 19 is already optimized

## Bundle Size Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Initial JS | ~500KB | <200KB | ⚠️ Needs review |
| Admin JS | ~400KB | <300KB | ⚠️ Charts heavy |
| Participant JS | ~200KB | <150KB | ✅ Good |
| CSS | ~50KB | <50KB | ✅ Good |

## Action Items

- [x] Add `optimizePackageImports` for recharts, lucide-react
- [x] Implement dynamic imports for chart components
- [x] Use `next/dynamic` with `ssr: false` for client-only components
- [x] Lazy load admin panel components
- [ ] Consider replacing recharts with lighter alternative (optional)
- [ ] Audit Tailwind CSS purging configuration
