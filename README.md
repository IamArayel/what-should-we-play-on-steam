# What Should We Play On Steam

Fork de [Timmy1e/what-should-we-play-on-steam](https://gitlab.com/Timmy1e/what-should-we-play-on-steam).

Trouver un jeu auquel jouer entre amis est souvent laborieux : chacun compare sa bibliothèque à celle des autres, à la main. Cette application compare les bibliothèques Steam de plusieurs joueurs pour faire ressortir les jeux qu'ils ont en commun, via les [Steam APIs](https://developer.valvesoftware.com/wiki/).

## Stack

- Serveur Node.js / Express, vues EJS, front Vue 2.
- Redis, obligatoire : il met en cache les réponses de l'API Steam et la page d'accueil.
- Le SCSS (`public/styles`) et le JavaScript client (`public/scripts`) sont compilés à la volée par le serveur, il n'y a pas d'étape de build front.

## Prérequis

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ou Docker Engine avec le plugin Compose sous Linux)
- Une clé API Steam, à générer sur [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) (connexion avec un compte Steam requise, le nom de domaine demandé peut être `localhost`)

> L'image Docker est basée sur Node 13. Lancer le projet sans Docker demanderait cette même version, car `node-sass` ne compile pas sur les versions récentes de Node. Docker est donc la méthode recommandée.

## Installation

1. Cloner le dépôt et se placer dedans :

   ```sh
   git clone https://github.com/IamArayel/what-should-we-play-on-steam.git
   cd what-should-we-play-on-steam
   ```

2. Créer un fichier `.env` à la racine du projet, avec votre clé API Steam :

   ```env
   STEAM_KEY=VOTRE_CLE_STEAM
   ```

   Ce fichier est ignoré par Git et par Docker : la clé ne part ni dans le dépôt, ni dans l'image.

3. Démarrer Docker Desktop et vérifier que le daemon répond :

   ```sh
   docker info
   ```

   Si la commande renvoie une erreur de connexion, Docker Desktop n'est pas encore démarré.

## Lancer l'application en local

Depuis la racine du projet :

```sh
docker compose up --build
```

Cette commande construit l'image, démarre Redis et l'application, puis affiche les logs. Le serveur est prêt quand `Listening on port 3000` apparaît. `Ctrl+C` arrête tout.

Le fichier [docker-compose.yml](docker-compose.yml) lance l'application en mode développement :

- le code local est monté dans le conteneur, les modifications sont prises en compte sans reconstruire l'image ;
- `NODE_ENV=development` désactive le cache des vues Express et affiche le détail des erreurs dans le navigateur.

Pour les lancements suivants, `docker compose up` suffit. `--build` n'est utile qu'après une modification du `Dockerfile` ou du `package.json`.

## Visualiser l'interface dans le navigateur

1. Ouvrir [http://localhost:3000](http://localhost:3000).
2. Saisir, pour chaque joueur, son URL personnalisée Steam (la partie après `steamcommunity.com/id/`) ou son identifiant à 17 chiffres. Un nouveau champ apparaît dès qu'un nom est saisi.
3. Cliquer sur le dé : l'application tire au sort un jeu parmi ceux que tous les joueurs possèdent. Recliquer sur le dé pour en tirer un autre.

Les profils et les listes de jeux Steam doivent être **publics**, sinon les jeux d'un joueur ne remontent pas.

Si le port 3000 est déjà pris, remplacer `"3000:3000"` par `"8080:3000"` dans `docker-compose.yml` et ouvrir [http://localhost:8080](http://localhost:8080).

## Travailler sur le code

Selon le fichier modifié :

| Fichier modifié | Pour voir le changement |
| --- | --- |
| `public/styles/*.scss`, `public/scripts/*.js` | Rafraîchir la page |
| `views/*.ejs` | Vider le cache Redis (`docker compose exec redis redis-cli FLUSHALL`), puis rafraîchir la page. La page d'accueil y est gardée 15 minutes. |
| `app.js`, `server.js`, `routes/`, `models/` | Redémarrer l'application : `docker compose restart app` |
| `package.json`, `Dockerfile` | Reconstruire : `docker compose up --build` |

## Variables d'environnement

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `STEAM_KEY` | Clé API Steam, lue depuis `.env` | aucun, obligatoire |
| `REDIS_SERVICE_HOST` | Hôte Redis | `127.0.0.1` (`redis` avec Compose) |
| `REDIS_SERVICE_PORT` | Port Redis | `6379` |
| `REDIS_EXPIRE` | Durée du cache, en secondes | `900` |
| `PORT` | Port d'écoute du serveur | `3000` |
| `NODE_ENV` | `production` ou `development` | `production` dans l'image, `development` avec Compose |

## Arrêter et nettoyer

- Arrêter : `Ctrl+C` dans le terminal de `docker compose up`, ou `docker compose stop` depuis un autre terminal.
- Supprimer les conteneurs et le réseau : `docker compose down`.
- Supprimer aussi l'image construite : `docker compose down --rmi local`.

## Sans Docker Compose

Pour lancer l'image telle qu'en production (code embarqué dans l'image, sans montage), avec les commandes Docker de base :

```sh
docker network create wswpos
docker run -d --name wswpos-redis --network wswpos redis:7
docker build -t wswpos .
docker run --rm --init --name wswpos-app --network wswpos -p 3000:3000 -e STEAM_KEY=VOTRE_CLE_STEAM -e REDIS_SERVICE_HOST=wswpos-redis wswpos
```

Nettoyage : `docker rm -f wswpos-redis`, `docker network rm wswpos`, `docker rmi wswpos`.

## CI/CD

L'image Docker est construite automatiquement par GitHub Actions et publiée sur le [Container Registry](https://github.com/IamArayel/what-should-we-play-on-steam/pkgs/container/what-should-we-play-on-steam) du projet.
