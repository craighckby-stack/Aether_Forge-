# Neural Engine Post-Mortems

## Auto-Generated Lessons & Negative Constraints

### ❌ [2026-09-23] firestore.rules `source: mutation-cycle`
**Symptom:** AST / TypeScript Compiler Validation Rejected
**EVIDENCE (Machine-Copied Fact):**
```
Line 105, Col 1: Unexpected closing delimiter '}' with no matching opening pair.
```
**CONSTRAINT (Model Generalization):** Never repeat code patterns that produce this compiler/linter error on firestore.rules.
