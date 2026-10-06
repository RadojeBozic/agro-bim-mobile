# Dependency triage — AGRO-MOB-QA-001

2026-10-06: npm audit exit 1 reports 18 high, 11 moderate, 29 total affected packages and four root advisories. These are propagated dependency findings, not 29 independent vulnerabilities. npm ls confirmed the installed paths below. Expo SDK 57 compatibility takes precedence over audit-suggested breaking downgrades. No package or lockfile change was applied.

Classifications: (1) direct runtime dependency, (2) transitive runtime dependency, (3) development-only dependency, (4) tooling/build-only dependency, (5) Expo-managed dependency, (6) non-exploitable in the observed usage, (7) requires later upgrade. Being installed under dependencies does not establish native runtime exposure.

| Root package / severity | Installed path / classes | App exploit relevance | Available fix and Expo constraint | Recommendation |
|---|---|---|---|---|
| braces 3.0.3 / high | expo → @expo/metro → metro-file-map 0.84.5 → micromatch 4.0.8 → braces; 4,5,7 | Deep brace recursion can exhaust Node stack if hostile glob patterns reach build tooling. Farm/API data is not supplied as glob patterns. No native runtime path found; preserve controlled build inputs. | Latest registry 3.0.3; advisory lists no patched version. npm's Expo 44 downgrade is incompatible with SDK 57. | Keep open; track upstream patch; restrict dev server/build access. |
| node-forge 1.4.0 / high | expo → @expo/cli → node-forge; also @expo/code-signing-certificates 0.0.6 → node-forge; 4,5,7 | Vulnerable RSA signature verification needs crafted ASN.1 and relevant keys. Expo CLI certificate/signing tooling is involved; app Supabase/API token handling does not use node-forge as its verifier. Build tooling remains a real exposure, not a universally false positive. | Latest registry 1.4.0; advisory lists no patched version. Suggested Expo 44 downgrade is incompatible. | Keep open; trusted signing/certificate inputs only; upgrade via compatible Expo tooling when fixed. |
| decode-uri-component 0.2.2 / moderate | expo-router 57.0.25 → query-string 7.1.3 → decode-uri-component; 2,5,7 | Actual Router runtime dependency. Malformed external URL/query input can cause CPU exhaustion; development custom links and future auth/App Links make this relevant. No disclosure/RCE claimed. Current lack of verified App Links does not make this a false positive. | Fixed 0.5.0 exists, but query-string requires ^0.2.2; Router 57 requires ^7.1.3. Latest Router 57 is installed. Audit suggests Router 58.0.16, outside SDK 57. An override across the parent's range was not treated as non-breaking. | Keep open with priority; seek SDK 57 backport/compatible parent update. Avoid distributing before link-input exposure is reassessed; do not force Router 58 or blind overrides. |
| uuid 7.0.3 / moderate | expo-splash-screen → @expo/config-plugins 57.0.10 → xcode 3.0.1 → uuid; also Expo config plugins; 4,5,6,7 | Advisory affects v3/v5/v6 with caller-provided output buffer. Inspected xcode/lib/pbxProject.js uses uuid.v4() without a buffer. Not exploitable through this observed consumer; native app does not use this chain. Other future tooling consumers require reassessment. | Fixed 11.1.1 (and 12.0.1/13.0.1) exists. xcode requires ^7.0.3; swapping major is not proven safe. Audit suggests splash-screen 55.0.25, incompatible SDK downgrade. | Keep dependency finding tracked; defer compatible parent upgrade; document usage-based non-exploitability rather than claim advisory is wrong. |

No root issue is introduced by an application-owned direct runtime implementation. Direct Expo, React Native, Reanimated, Worklets and Splash Screen high/moderate labels propagate tooling advisories. Expo Router's moderate label propagates an actual runtime decoder risk. There is no independent development-only root finding in this audit. All package nodes and propagated paths are included in the inventory below.

Evidence sources:

- [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
- [decode-uri-component advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)
- [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)

Registry reads confirmed latest braces=3.0.3, node-forge=1.4.0, decode-uri-component=0.5.0 and expo-router@57 latest=57.0.25. Parent dependency ranges were read from installed package manifests. No npm audit fix, force upgrades or SDK upgrade was run in this QA task. The foundation's earlier non-forced remediation did not clear these findings.

## Complete affected-package inventory

| Package | Severity | Direct? | Classification/exposure | Immediate advisory path |
|---|---|---|---|---|
| @expo/cli | high | False | 4,5,7: Expo/RN build tooling propagation | @expo/code-signing-certificates, @expo/config, @expo/config-plugins, @expo/inline-modules, @expo/metro, @expo/metro-config, @expo/prebuild-config, node-forge |
| @expo/code-signing-certificates | high | False | 4,5,7: Expo/RN build tooling propagation | node-forge |
| @expo/config | moderate | False | 4,5,7: Expo/RN build tooling propagation | @expo/config-plugins |
| @expo/config-plugins | moderate | False | 4,5,7: Expo/RN build tooling propagation | xcode |
| @expo/inline-modules | moderate | False | 4,5,7: Expo/RN build tooling propagation | @expo/config-plugins |
| @expo/local-build-cache-provider | moderate | False | 4,5,7: Expo/RN build tooling propagation | @expo/config |
| @expo/metro | high | False | 4,5,7: Expo/RN build tooling propagation | metro, metro-config, metro-file-map, metro-transform-worker |
| @expo/metro-config | high | False | 4,5,7: Expo/RN build tooling propagation | @expo/config, @expo/metro |
| @expo/prebuild-config | moderate | False | 4,5,7: Expo/RN build tooling propagation | @expo/config, @expo/config-plugins |
| @react-native/community-cli-plugin | high | False | 4,5,7: Expo/RN build tooling propagation | @react-native/metro-config, metro, metro-config |
| @react-native/metro-config | high | False | 4,5,7: Expo/RN build tooling propagation | metro-config |
| @react-native/virtualized-lists | high | False | 4,5,7: Expo/RN build tooling propagation | react-native |
| braces | high | False | 4,5,7: Expo/RN build tooling propagation | braces |
| decode-uri-component | moderate | False | 2,5,7: Router runtime decoder | decode-uri-component |
| expo | high | True | 1,5,7: direct app package; finding originates in tooling | @expo/cli, @expo/config, @expo/config-plugins, @expo/local-build-cache-provider, @expo/metro, @expo/metro-config |
| expo-router | moderate | True | 1,5,7: direct Router runtime, transitive issue | query-string |
| expo-splash-screen | moderate | True | 1,5,7: direct app package; finding originates in tooling | @expo/config-plugins |
| metro | high | False | 4,5,7: Expo/RN build tooling propagation | metro-config, metro-file-map, metro-transform-worker |
| metro-config | high | False | 4,5,7: Expo/RN build tooling propagation | metro |
| metro-file-map | high | False | 4,5,7: Expo/RN build tooling propagation | micromatch |
| metro-transform-worker | high | False | 4,5,7: Expo/RN build tooling propagation | metro |
| micromatch | high | False | 4,5,7: Expo/RN build tooling propagation | braces |
| node-forge | high | False | 4,5,7: Expo/RN build tooling propagation | node-forge |
| query-string | moderate | False | 2,5,7: Router runtime decoder | decode-uri-component |
| react-native | high | True | 1,5,7: direct app package; finding originates in tooling | @react-native/community-cli-plugin, @react-native/virtualized-lists |
| react-native-reanimated | high | True | 1,5,7: direct app package; finding originates in tooling | react-native, react-native-worklets |
| react-native-worklets | high | True | 1,5,7: direct app package; finding originates in tooling | @react-native/metro-config, react-native |
| uuid | moderate | False | 4,5,6,7: observed v4 tooling consumer | uuid |
| xcode | moderate | False | 4,5,7: Expo/RN build tooling propagation | uuid |
