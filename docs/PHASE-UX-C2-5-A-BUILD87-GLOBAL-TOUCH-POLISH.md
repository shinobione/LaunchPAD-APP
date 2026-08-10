# PHASE UX · C2.5-A · Build 87 — Global Touch Polish

Build: `2026.08.10.87`
Release: `phase-ux-c2-5-a-global-touch-polish-20260810`
Cache: `shinobi-launchpad-v87`
Safety: `safety/pre-build87-global-touch-polish-20260810-2045`

## Input réel utilisateur

Build 86 a été validé sur Android/PWA pour les points fonctionnels principaux :
- Show Track Canvas : loop seamless ;
- Track Video : loop seamless ;
- Track page action temporaire : supprimée ;
- Favoris : ajout/retrait et rafraîchissement visuel OK ;
- Queue : OK ;
- gros rectangle tactile du mini-player : disparu ;
- seek : OK.

Le seul défaut résiduel relevé sur Build 86 est cosmétique : en vue Collapsed, la cover ne réapparaît plus à la jonction de loop mais un très bref fond noir peut rester visible. Le moteur Canvas n'est pas modifié dans Build 87.

## Objectif Build 87

Généraliser à tout LaunchPAD le comportement tactile propre validé dans le mini-player Build 86 : supprimer le tap-highlight / grand rectangle de sélection Chromium-WebKit sans casser les contrôles, les états actifs ni l'accessibilité clavier.

## Implémentation

Nouvelle couche CSS `css/global-touch-polish-v87.css` :
- sur périphériques `hover:none` ou `pointer:coarse`, désactive `-webkit-tap-highlight-color` sur l'interface ;
- ne désactive PAS `user-select` globalement, afin de préserver la sélection de texte et les usages Lyrics ;
- neutralise l'outline uniquement sur `:focus:not(:focus-visible)` des éléments interactifs ;
- conserve donc les styles `:focus-visible` existants pour clavier / navigation assistée.

La feuille est injectée par `js/build-config.js` après les couches Build 85 et Build 86.

## Sanctuarisation

Build 87 ne modifie pas :
- `js/features/lyrics-studio.js` ;
- `js/features/studio-loop-parity-v85.js` ;
- `js/features/track-videos.js` ;
- `js/features/library-memory.js` ;
- `js/features/queue-ui.js` ;
- audio / vidéo / MediaSession ;
- Worker Cloudflare ;
- R2 ;
- Track Manager ;
- SonicTrace ;
- C2.5-B+ / C3 / Phase 7.

Aucune nouvelle propriété `play`, `pause`, `load`, `src` ou `currentTime` n'est introduite par Build 87.

## Smoke attendu

Sur Android/PWA :
1. parcourir Home, Music, Lyrics, Audio Lab et Track Page ;
2. toucher boutons, liens, cartes, filtres, tabs, favoris et queue ;
3. vérifier l'absence de gros rectangle natif de sélection ;
4. vérifier que les actions fonctionnent toujours ;
5. revalider Show Track / Collapsed / seek / Track Video.

Sur desktop clavier :
- utiliser Tab / Shift+Tab ;
- vérifier que les éléments qui avaient déjà un `:focus-visible` conservent leur focus visible.

Build 87 est une couche de présentation candidate jusqu'au smoke réel utilisateur.
