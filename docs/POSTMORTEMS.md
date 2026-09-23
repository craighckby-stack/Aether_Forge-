# Neural Engine Post-Mortems

## Auto-Generated Lessons & Negative Constraints

### ❌ [2026-09-23] firestore.rules `source: mutation-cycle`
**Symptom:** AST / TypeScript Compiler Validation Rejected
**EVIDENCE (Machine-Copied Fact):**
```
Line 105, Col 1: Unexpected closing delimiter '}' with no matching opening pair.
```
**CONSTRAINT (Model Generalization):** Never repeat code patterns that produce this compiler/linter error on firestore.rules.

### ❌ [2026-09-23] src/engine/darlekRAG.ts `source: mutation-cycle`
**Symptom:** AST / TypeScript Compiler Validation Rejected
**EVIDENCE (Machine-Copied Fact):**
```
Line 506, Col 2: Unterminated template literal.
Line 265, Col 8: Property declaration is missing its type annotation.
```
**CONSTRAINT (Model Generalization):** Never repeat code patterns that produce this compiler/linter error on src/engine/darlekRAG.ts.

### ❌ [2026-09-23] firestore.rules `source: mutation-cycle`
**Symptom:** AST / TypeScript Compiler Validation Rejected
**EVIDENCE (Machine-Copied Fact):**
```
Line 114, Col 1: Unexpected closing delimiter '}' with no matching opening pair.
```
**CONSTRAINT (Model Generalization):** Never repeat code patterns that produce this compiler/linter error on firestore.rules.
