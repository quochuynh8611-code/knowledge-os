# P0.3 Architecture Extraction — Test Strategy & Baseline Document

## 1. Test Harness Architecture Decisions
- **`supertest` Transport**: Approved and installed as `devDependency` (`supertest@^7.2.2`, `@types/supertest@^7.2.1`).
- **Zero Direct `server.ts` Imports**: `server.ts` executes `startServer()` (invoking `createViteServer()` and `app.listen(3000)`) at module level. No test may import `server.ts` directly.
- **Isolated Test App Construction**: All HTTP endpoint/middleware/router tests must construct an isolated `express()` test instance mounting specific router factories (e.g. `createCategoryRouter(mockPrisma)`), or test pure service functions directly.
- **Zero Real Database / Network Calls**: PostgreSQL operations and Gemini API endpoints are strictly tested via dependency injection stubs and mock wrappers.

---

## 2. Official P0.3 Baseline Diagnostics (Pre-existing 7 TypeScript Errors)
The following 7 diagnostics are acknowledged as pre-existing baseline and are **not** to be fixed during Phase B/P0.3 extraction unless explicitly approved:

1. `src/context/DataContext.tsx(730,5)`: Cannot find name 'setIsTimerRunning'.
2. `src/context/DataContext.tsx(731,5)`: Cannot find name 'setTimerSeconds'.
3. `src/services/dataRepository.ts(158,7)`: Type compatibility on `Topic.links[].id` (optional vs required).
4. `src/services/researchRepositoryV2.ts(37,14)`: Class 'ResearchRepositoryV2' missing implementation of `resetAllData`.
5. `tests/unit/obsidian-lib.test.ts(455,478)`: Fixture topic missing `categoryId`.
6. `tests/unit/phase2c-data-management-modal-component.test.tsx(77,5)`: Mock `IDataRepository` missing `resetAllData`.
7. `tests/unit/storage-repository-ssot.test.ts(55,77)`: Fixture topic missing `links`, `studyProgress`.

**Baseline Test & Build Status**:
- Vitest: 87/87 test files passed (576/576 tests).
- Build: SUCCESS (`dist/server.cjs`).
