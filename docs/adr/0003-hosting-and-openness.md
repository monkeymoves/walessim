# 0003: Own Firebase site, public repository

*26 November 2026. Accepted.*

**Decision.**
- Static build deployed to its own Firebase Hosting site, `etifeddiaeth`, on the existing `d3-showcase-apps` project. Its own site means its own browser storage origin, so it cannot collide with Luke's other apps.
- No backend in v1. Firestore only later (shared scenarios, workshop rooms).
- Public GitHub repository `monkeymoves/walessim`. Code MIT; model and content CC BY 4.0; data under each source's licence, attributed in the app and `model/sources.yaml`.
- Raw downloads (`pipeline/raw/`, `design/raw/`) are gitignored; only processed, attributable outputs are committed.

**Consequences.** Anyone can read and fork the rule book. Licence doubts about a dataset block its commit, not just its use.
