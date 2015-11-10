# Hybrid shadow
![2015_11_09_elephant_shadowvolume_gpu](https://raw.githubusercontent.com/yoyonel/bablib_projects/master/projects/prog/shadow_projects/hybrid_shadow/screenshots/2015_11_09_elephant_shadowvolume_gpu.png)
## Idée de départ
Utiliser un modèle de de gestion de lumière diffuse (gouraud: interpolation aux sommets) pour générer/détecter de nouvelles arêtes de contour.

Ces arêtes de contour correspondent à des cycles d'iso courbes (pour les ombres aux environs +- 0.0).

L'avantage est que ces arêtes de contours sont entièrement définies par les valeurs d'éclairages localement à chaque triangle (donc plus besoin d'infos de connectivités).

### Problèmes
- Le modèle de base pour détecter les arêtes de contour s'appuient sur les arêtes des triangles et leur appartenance à deux types opposées de triangle,
	- un triangle éclairé
	- un second non éclairé par la source de lumière.

Une autre facon de voir est de considérer la visibilité des triangles pour la source de lumière, un des triangles est visible ou orienté vers la source de lumière (demi espace défini par le plan supportant le triangle et sa normale) et le second non visible.
On peut voir cette définition comme la frontière/iso courbe (~0) sur un modèle flat-shading (une normale par face).

Dans ce modèle, l'éclairage (flat) et la vibilité sont communs, donc quand une arête est de contour, elle correspond aussi à une arête de contour de visibilité.
Ce qui induit que les volumes d'ombres extrudés n'englobent (pas forcément) les zones d'ombres dures liés au modele triangulaire.

## DSM
Le FB eyes contient tout les receivers de la scène et un sous ensemble de casters.
Un FB light (DSM) contient une discrétisation de (presque) tout les casters et aucun receivers.
Lors de la construction de la DSM, on peut distinguer 3 types de texel:
1. totalement **Inactif**: aucun caster dans le frustum lié au texel
2. **Actif**
	1. ne contenant pas de "silhouettes": la DSM contient alors la profondeur minimale du caster recouvrant (en partie) le texel.
	2. contenant au moins une "silhouette": Un contour (au moins) est présent dans le frustum lié à ce texel.

On peut retro-projeter par la suite la DSM dans la scène et affecter ainsi chaque texel receiver d'un coefficient de visibilité.
- Tous les texels-eyes se trouvant dans le frustum du 1er cas (1.) sont totalement illuminés (aucunes occlusions).
- Tous les texels-eyes se trouvant dans le frustum du 2nd cas (2.1) sont totalement ombrés (occlusion totale).

-> Ces deux premiers cas ne nécessitent aucunes informations de contour (silhouettes des casters), donc n'ont pas besoin des infos fournies par le ShadowVolume.

- Le 3ème cas (2.2) nécessitent des informations de contours.

-> On peut (et on doit) appliquer le ShadowVolume (extrusion) (que) sur les texels-eyes dans les frustums associés à ces texels.


# Shadow Volume Full GPU
![2015_11_09_elephant_shadowvolume_gpu_edges_wedges](https://raw.githubusercontent.com/yoyonel/bablib_projects/master/projects/prog/shadow_projects/hybrid_shadow/screenshots/2015_11_09_elephant_shadowvolume_gpu_edges_wedges.png)

Utilisation des arêtes de contours définies par rapport aux informations d'intensité lumineuse (iso courbe de surface).
On peut détecter localement dans quels triangles passe l'iso courbe de frontière d'ombre (+/- 0).
On construit dans un geometry shader les shadow volumes d'extensions (shadow-quad, near and far cap pour le Z-FAIL).

## Problèmes
La technique de base pour construire localement les near&far cap des volumes d'ombre s'appuie directement sur les triangles occulteurs (illuminés, ombrés).
Les Shadow-Quads s'appuient sur le modèle d'iso courbe.
Il y a donc une différence de modèle qui induit des erreurs pour reformer correctement le volume d'ombre.

## Solution
Ramener la création des near&far caps sur un modèle utilisant la courbe d'iso valeur sur l'intensité lumineuse.
Toujours utiliser l'information de visibilité de la face et savoir si une iso courbe de silhouette passe par le triangle.

3 types de triangle:
  1. triangle totalement illuminé    => near cap (geom. shad. 3)
  2. triangle totalement ombré       => far cap (geom. shad. 3)
  3. triangle partiellement ombre/illumé: L'iso courbe de silhouette passe par le triangle. Le triangle est donc coupé en 1 quadrilatère et un triangle. Avec le Shadow-Quad, on a donc pour le geom. shad.: 4 + 4 + 3 = 11

Il faut faire des tests de perf. pour savoir s'il faut décomposer le rendu (2 rendu avec un traitement séparé, ou 1 rendu avec des if et un vertices_out au max (= 11)).

## Autres problèmes
- Z-Fight lié à la différence entre les frontières de visibilité (servant aussi de frontière d'ombre pour l'éclairage FLAT (classique des shadow-volumes)) et celle lié au modèle d'éclairage GOURAUD/PHONG. Autrement dit le problème vient que le volume d'ombre ou le quad englobant le volume d'ombre coupe le triangle occulteur (générateur) au niveau de la frontière d'éclairage.
- Problèmes de précision pour caractériser les faces illumées/auto-ombrées. Normale quasi perpendiculaire avec le vecteur directeur reliant un point de la face et la position de la lumière. Problème lié au partionnement local des triangles.

## Remarques
Aucun problème en Z-PASS, avec le rendu (seul) des shadow-quads (sans near et far caps, en particulier near-caps).

### Intuitions
- séparer les pass de rendu des shadow-quads, et des caps
- utiliser pour les caps un polygon-offset fill
Ecrire au clair ce qu'il ne va pas, ce qu'on fait (en particulier avec les caps), les problèmes de z-fighting, etc ...

### Solutions
- Z-Fight "classique" lié à l'utilisation des caps near/far en ZFail. Le polygon offset semble être la solution standard à ce problème.
- Manque de Précision pour caractériser les faces venait directement d'un manque de cohérence dans les modèles d'éclairages/visibilités utilisés.  
	- Dans un cas: détection des edges, j'utilise un modèle gouraud d'éclairage et la courbe de silhouette résultante (iso courbe)
	- Dans l'autre cas: détection des faces illuminés: j'utilisais un modèle dit "flat" (une normale par face, appartenance au sous-espace délimité par la face).  
=> Pour supprimer le problème de précision, il suffisait de ramener le deuxième cas dans le modèle d'éclairage gouraud, donc de prendre en compte les normales associées aux sommets (plutot que la normale associée à la face).

## Problèmes

Le problème de Z-Fight n'est pas solutionné (en fait).
Utiliser le self-shadowing avec un polygon ofsset semble etre un bon "hack" si l'ambiant est nulle (ombre dur 0 ou 1).
On peut utiliser cet hack pour créer un lit-buffer (ou shadow-buffer) et remapper ensuite ce buffer sur la scèné (via un processus defered).
Le problème reste toutefois présent, c'est à dire que le volume d'ombre généré (shadow-quad) auto-intersecte la face génératrice (triangle qui possède la silhouette de contour).

## Remarques
Notions de:
  - Premier "récepteur"
  - Silhouette Edge Pixel in ScreenSpace <=> un rayon (unique) vers la source de lumière intercepté par la ligne de silhouette sur l'occulteur

Une silhouette de contour en LightSpace peut recouvrir plusieurs texels.
Il faut relier les texels d'une silhouette à un seul texel (une sorte de redirection)
Toutes les opérations doivent être conservatives (rasterisation des segments conservatives!)
L'information qu'on souhaite déterminer est:
  - pour un texel-silhouette (possèdant/représentant une ou plusieurs silhouettes) qu'elle est la profondeur min/max des receivers (on pourra décomposer le problème en deux au départ min et max)
