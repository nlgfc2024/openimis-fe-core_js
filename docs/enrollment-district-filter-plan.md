# Household enrollment district filter: openimis-fe-core_js

Status: implementation planning only. This branch currently contains documentation, not a working district filter.

## Branch and ownership

- Base: `mw/develop`; do not branch from the repository default if it differs.
- Feature branch: `feature/enrollment-district-filter-label`.
- Assignee: @YutakaX17.
- Requested reviewers: @mcleanka, @uniquedj95, @Lenwell89.
- Target project: https://github.com/orgs/nlgfc2024/projects/12 (project membership pending authorization).

## Behavior and shared contract

Keep the phase criterion `validation_status = VERIFIED` locked during enrollment. Under Add filters, offer `Location – District (R) | Equals | [Select district]` as an optional household operator filter. Select from active location master data within permitted scope, not a hard-coded list.

Use the schema property `district_id: {"type":"integer"}` on GROUP phases. A selected numeric database location ID serializes as `district_id__exact__integer=123`. An empty/cleared/removed selection contributes no condition. Do not put district in saved phase advanced_criteria, use an all-district sentinel, or duplicate district data in household json_ext.

The backend must use Group.location and district ancestry, intersect with authenticated user scope before eligibility counts/ranking, retain VERIFIED and existing phase-wide capacity rules, and apply identical rules to summary, preview and confirmation. A selected R can match its active descendants at any depth. No district selection must never disable access restrictions. Confirmation revalidates current eligibility.

## Small reviewable commits

Issue order below is the intended commit sequence in this repository. Each implementation commit includes its focused regression tests and references its issue. Record actual test commands/results and commit SHA in the issue; do not mark work complete based on this planning file.

### CORE-1: Add the District (R) enrollment filter label

Issue: https://github.com/nlgfc2024/openimis-fe-core_js/issues/25

Suggested commit: `feat(i18n): label district enrollment filter`

Add advancedFilters.district_id with English label Location – District (R) in src/translations/en.json. Audit supported locale conventions and add accurate supported translations or documented fallback as appropriate. The shared CustomFilterFieldStatusPicker already resolves advancedFilters.<field>; avoid changing generic rendering or building a new filter framework.

Acceptance:

- [ ] Field picker resolves the label instead of displaying a raw translation key.
- [ ] Translation resources parse and existing keys are preserved.
- [ ] Document locale fallback where an approved translation is unavailable.

Dependencies: none.

## Cross-repository integration and review

- BE-1: https://github.com/nlgfc2024/openimis-be-individual_py/issues/19
- BE-2: https://github.com/nlgfc2024/openimis-be-individual_py/issues/20
- BE-3: https://github.com/nlgfc2024/openimis-be-individual_py/issues/21
- FE-1: https://github.com/nlgfc2024/openimis-fe-individual_js/issues/23
- FE-2: https://github.com/nlgfc2024/openimis-fe-individual_js/issues/24
- FE-3: https://github.com/nlgfc2024/openimis-fe-individual_js/issues/25
- APP-BE-1: https://github.com/nlgfc2024/openimis-be_py/issues/15
- APP-BE-2: https://github.com/nlgfc2024/openimis-be_py/issues/16
- APP-FE-1: https://github.com/nlgfc2024/openimis-fe_js/issues/9
- APP-FE-2: https://github.com/nlgfc2024/openimis-fe_js/issues/10

Backend and frontend module work must merge before assembly references are updated. Staging uses test configuration; production defaults and existing-phase schema updates follow successful integrated acceptance. Preserve unrelated schema properties, document export/rollback, and avoid applying production configuration in this planning PR.

Check current enrollment refactors before implementation: backend PRs https://github.com/nlgfc2024/openimis-be-individual_py/pull/8, https://github.com/nlgfc2024/openimis-be-individual_py/pull/17 and https://github.com/nlgfc2024/openimis-be-individual_py/pull/18, and frontend PR https://github.com/nlgfc2024/openimis-fe-individual_js/pull/22. Rebase on current mw/develop and adapt paths if enrollment ownership moves; do not merge unrelated work into this feature merely to avoid resolving overlap.

Keep commits separated by issue for reviewer navigation. Add new commits for review fixes where practical; no implementation issue is closed by the initial documentation commit. Before marking the feature ready, update the PR description to describe actual delivered behavior, actual validation, remaining risks, and completed issue links. Since mw/develop may not be the repository default branch, verify issue closure explicitly after implementation is merged rather than relying solely on automatic closing keywords.

