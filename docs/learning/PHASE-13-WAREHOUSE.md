# Phase 13 Learning Note: Warehouse Routing and Simulation Correctness

## What changed and why

The original BFS silently generated a Manhattan route through blocked cells when routing failed. The engine now returns an explicit reachable/unreachable result, exposes failure reasons, and moves the controller into `ERROR`. BFS, A*, and bounded cached BFS implement one strategy contract. Pure metric calculation, controller lifecycle, multi-picker allocation, CSV edge cases, and route failures are tested. Phaser and Recharts are lazy chunks.

Routing connects the HLD simulation engine to controller state and then Phaser events. The LLD invariant is simple: every movement step must be an adjacent walkable cell; an impossible route stops the run. BFS is `O(V+E)` time/`O(V)` memory. A* keeps shortest-path correctness with an admissible Manhattan heuristic and visited fewer nodes in the fixture comparison. Cached BFS trades bounded memory for repeated-query latency.

No MongoDB/Express backend was added. Browser execution already supports configure/upload/simulate/inspect/export. A Web Worker becomes justified by measured long tasks; a Node worker plus MongoDB jobs becomes justified by durable batch experiments, saved projects/datasets, and tab-independent execution.

## Likely interviewer questions

1. Why was the fallback unsafe? It ignored obstacles and turned unreachable layouts into invalid movement.
2. BFS versus A*? Both are optimal here; A* uses a heuristic to explore fewer nodes, while BFS is simpler.
3. Why cache routes? Warehouse endpoints repeat; bounded caching avoids recomputation without unbounded memory.
4. How are metrics tested? A pure function receives known arrivals, fulfillment, travel, busy time, and picks, then exact outputs are asserted.
5. Why no MERN extension? Persistence is not yet a meaningful user workflow and would add unjustified operations.

Skeptical follow-ups: Does one benchmark prove A* is faster? No; timing varies, but equal path length and visited-node counts are reproducible. Can the browser freeze? Large batch runs can; profiling long tasks/dropped frames is the trigger for a Web Worker.
