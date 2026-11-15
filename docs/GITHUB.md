# Publier ChickenWing sur GitHub

## Les termes que vous verrez

| Terme | À quoi ça sert |
| --- | --- |
| **Repository** ou dépôt | Le dossier du projet sur GitHub, avec le code, le README et l’historique. |
| **Commit** | Un enregistrement daté des changements, avec un titre. `main` est la branche principale. |
| **Push** | L’envoi de vos commits locaux vers le dépôt GitHub. |
| **Tag** | Un repère qui désigne le commit exact d’une version, par exemple `v1.11.2-beta.1`. |
| **Release** | La page de téléchargement d’une version, avec notes de version et fichiers dans **Assets**. |
| **Issue** | Une fiche publique dans un dépôt public pour signaler un bug, poser une question ou proposer une amélioration. |
| **Import repository** | L’outil pour copier un dépôt Git déjà hébergé ailleurs en ligne. |
| **Project** | Un tableau de suivi des tâches et des issues. |
| **Gist** | Une page séparée pour partager un extrait ou un petit fichier. |
| **Codespace** | Un environnement de développement en ligne, avec éditeur et terminal. |
| **GitHub Pages** | L’hébergement qui permettra de lancer la version web depuis une URL. |

Pour la première bêta, il vous faut un dépôt, un premier commit et une release.

## 1. Mettre le code sur GitHub avec GitHub Desktop

1. Installez [GitHub Desktop](https://desktop.github.com/) et connectez-vous avec votre compte GitHub.
2. Ouvrez **File → Add Local Repository…** et sélectionnez le dossier `ChickenWing` qui contient ce guide. C’est déjà un dépôt Git local, avec la branche `main` prête pour le premier commit.
3. Dans **Changes**, relisez les fichiers proposés. Le `.gitignore` écarte les archives dans `releases/`, les résultats dans `output/` et les snapshots personnels connus. Vérifiez vos fichiers récents, notamment les scènes, les fiches techniques et les captures. Les bases dans `public/yamaha/` sont des sessions initiales enregistrées dans les éditeurs Yamaha. Avant une diffusion publique, vérifiez vos droits de redistribuer ces fichiers et les autres ressources de tiers. [Origine des bases Yamaha](YAMAHA.md)
4. Dans **Summary**, écrivez `Préparer ChickenWing 1.11.2 bêta 1`, puis cliquez sur **Commit to main**. Ce clic crée l’enregistrement sur votre Mac.
5. Cliquez sur **Publish repository**. Utilisez `ChickenWing` comme nom et votre compte comme propriétaire. Cochez **Keep this code private** pour ouvrir le projet à des testeurs invités. Décochez cette option si vous souhaitez que les visiteurs puissent consulter le code et télécharger la bêta sans invitation. Un dépôt public rend également son code consultable et forkable. Choisissez une licence séparément si vous souhaitez autoriser la réutilisation. [Guide GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop?platform=mac) · [Licences sur GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

Pour inviter des collaborateurs, utilisez **Settings → Collaborators**. Sur un dépôt privé détenu par votre compte personnel, les personnes invitées obtiennent aussi un accès en écriture. Pour un essai privé avec des personnes qui ont seulement besoin d’ouvrir l’application, vous pouvez leur transmettre directement l’archive correspondant à leur machine. [Droits des collaborateurs GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository)

## 2. Créer la page de téléchargement

1. Sur le site GitHub, ouvrez le dépôt `ChickenWing`, puis **Releases → Draft a new release**.
2. Choisissez **Choose a tag**, saisissez `v1.11.2-beta.1`, puis sélectionnez **Create new tag**. Comme cible, choisissez `main`, avec le commit qui correspond aux fichiers compilés.
3. Saisissez le titre `ChickenWing 1.11.2 bêta 1`. Vous pouvez copier les [notes de version](BETA.md) dans la description. Si vous activez le site mobile, ajoutez aussi son URL. Pour partager les vérifications détaillées, utilisez le lien GitHub complet de `docs/VERIFICATION.md` dans la description.
4. Dans le Finder, ouvrez `releases/v1.11.2-beta.1/` et glissez les quatre archives ZIP et `SHA256SUMS.txt` dans la zone de dépôt des pièces jointes. GitHub crée aussi ses propres archives **Source code** automatiquement. Les testeurs choisissent le ZIP `ChickenWing-…` correspondant à leur machine.
5. Cochez la case **Pre-release**. Utilisez **Save draft** pour relire la description et vérifier les fichiers, puis **Publish release** quand vous êtes prêt à partager. Envoyez le lien de cette release, qui se termine par `/releases/tag/v1.11.2-beta.1`. [Guide des releases GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

## 3. Activer la version web pour mobile

1. Dans le dépôt, ouvrez **Settings → Pages** et choisissez **GitHub Actions** comme source. Sur GitHub Free, Pages est disponible pour les dépôts publics.
2. Ouvrez **Actions → Publier la bêta web → Run workflow**, sélectionnez `main`, puis lancez le traitement.
3. Après le déploiement, le lien apparaît dans le résumé du workflow et sous **Settings → Pages**. Avec un dépôt nommé `ChickenWing`, l’adresse par défaut est `https://VOTRE-COMPTE.github.io/ChickenWing/`.

Ouvrez cette adresse sur iPhone ou Android dans Safari ou Chrome. C’est une bêta web. Les performances de l’OCR, l’impression et les téléchargements peuvent varier selon le téléphone. Les données de la version web sont stockées dans le navigateur utilisé. [Configurer GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Construire une prochaine bêta

Depuis un Mac avec Node.js 22.12 ou une version plus récente et npm, mettez à jour la version du projet avec `npm version 1.11.2-beta.2 --no-git-tag-version`, puis exécutez ces commandes dans le dossier du projet.

```sh
npm ci
npm test
npm run dist
```

Les archives et leurs empreintes SHA-256 sont produites dans `releases/v1.11.2-beta.2/`. Le premier build télécharge le moteur Electron pour chaque plateforme. Pour ne construire qu’une archive, utilisez par exemple `npm run dist -- mac-arm64`. Après vos essais, créez un commit dans GitHub Desktop et cliquez sur **Push origin**. Créez une nouvelle release avec le nouveau tag et les nouveaux fichiers. Mettez à jour les noms de fichiers dans les notes de cette release.
