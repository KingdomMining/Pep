/**
 * @lowvolt/rule-engine — pure, dependency-free validation core.
 *
 * Phase 1 ships the engineering calculators and the package boundary.
 * Phase 2 adds: the expression evaluator, the rule loader (a rule with no
 * fixture does not load), incremental dirty-node invalidation, and the
 * `(design_graph, catalog, rule_set) -> violations[]` entry point.
 *
 * Nothing in this package may import React, a database driver, or the network.
 */
export * from './calc.js';

export const ENGINE_VERSION = '0.1.0';
