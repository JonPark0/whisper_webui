# Bundled fonts

Self-hosted so the app works without internet access (the backend image
runs with `HF_HUB_OFFLINE=1`; the UI should not depend on a CDN either).
All four families are licensed under the SIL Open Font License 1.1.

| File | Family | Source |
|---|---|---|
| `Exo-2-latin.woff2` | Exo 2 (variable, 300–500, Latin subset) | Google Fonts |
| `Anta-latin.woff2` | Anta (Latin subset) | Google Fonts |
| `JetBrains-Mono-latin.woff2` | JetBrains Mono (variable, 400–500, Latin subset) | Google Fonts |
| `PretendardVariable.woff2` | Pretendard Variable 1.3.9 (Hangul + Latin) | npm `pretendard` |

Exo 2 and Anta come from the PALNARIUM design reference. Exo 2 has no
Hangul, so every stack falls back to Pretendard for Korean text.
