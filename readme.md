# Redmine tickets printer

Un outil permettant d'imprimer rapidement les notes redmine du sprint sous forme de tickets.

# Installation de la commande sur son propre poste.

A la racine du projet :
```js
    yarn install
    mv config.dist.js config.js
```

Editer le fichier `config.js` :

- Pour `hostname`, `auth.username`, `auth.password`, `getTicketUrl`, demander ces infos à l'équipe.
- Pour `auth.key`, la trouver ici : http://redmine.lefigaro.fr/my/account (dans la colonne de droite, cliquer sur "Afficher" en dessous de "Clé d'accès API")
- Pour `project.parentId`, allez sur l'URL redmine votre projet et trouvez son id après /projects, ex: http://redmine.lefigaro.fr/projects/video-live => video-live
- Pour `projet.colors` chaque clef est l'ID d'un sous projet, chaque valeur est une des 16 couleurs du terminal (et des postits ;-)).

Pour lancer la commande :

```js
    node app.js
```

Astuce : Ajouter la commande en tant qu'alias afin de la trouver simplement:

Ajouter `alias postits="node /path/to/this/git/redmine-postit/app.js"`
Afin de lancer simplement la commande.
