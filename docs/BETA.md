# ChickenWing 0.5 bêta

ChickenWing prépare les shows pour les consoles Behringer WING, Midas M32 et Yamaha QL, CL et DM. Cette bêta inclut la préparation du patch et du routage, l’import de fiches techniques, la fiche A4 et le convertisseur Show Evangelist.

## Téléchargement

Sur la [page de téléchargement](https://github.com/Nakwa41/ChickenWing/releases/tag/v0.5.0-beta), choisissez une archive selon votre machine dans **Assets**.

| Machine | Fichier |
| --- | --- |
| Mac avec puce Apple M1, M2 ou plus récente | `ChickenWing-0.5.0-beta-mac-arm64.zip` |
| Mac avec processeur Intel | `ChickenWing-0.5.0-beta-mac-x64.zip` |
| PC Windows 10 ou 11 64 bits, avec processeur Intel ou AMD | `ChickenWing-0.5.0-beta-windows-x64.zip` |
| PC Windows 11 avec processeur ARM, par exemple Snapdragon | `ChickenWing-0.5.0-beta-windows-arm64.zip` |

**Mac, macOS Ventura 13 ou plus récent.** Pour identifier votre Mac, allez dans ** → À propos de ce Mac** et regardez la ligne **Puce** ou **Processeur**. Décompressez l’archive, déplacez `ChickenWing.app` dans **Applications**, puis ouvrez-la. Cette bêta utilise une signature locale et n’a pas de notarisation Apple. Gatekeeper peut afficher un avertissement ou bloquer l’ouverture. [Informations Apple](https://support.apple.com/fr-fr/102445)

**Windows.** Allez dans **Paramètres → Système → Informations système** pour connaître le type de processeur. Faites un clic droit sur le ZIP, choisissez **Extraire tout**, puis ouvrez `ChickenWing.exe` dans le dossier extrait. Gardez ensemble les fichiers du dossier. L’exécutable est fourni sans signature Authenticode. SmartScreen ou les règles de sécurité de votre PC peuvent bloquer certaines ouvertures. [Informations Microsoft](https://learn.microsoft.com/fr-fr/windows/apps/package-and-deploy/smartscreen-reputation)

Sur ordinateur, l’application fonctionne hors ligne après extraction. Les shows sont enregistrés sur l’appareil. Si vous avez déjà des shows dans la version navigateur ou changez de machine, utilisez **Exporter le show → Fichiers console, CSV, JSON → Projet ChickenWing**, puis importez le fichier `.chickenwing.json` dans l’autre version. Chaque installation et profil de navigateur a son propre espace de stockage.

## Essais bêta

- Vérifiez un import de fiche, un export de projet et la réouverture du show après avoir quitté l’application.
- Avant de rappeler un fichier de scène sur une console, contrôlez-le dans l’éditeur du constructeur. Consultez le guide correspondant à votre console pour les limites des exports.
- Pour un retour, ouvrez une **Issue** sur GitHub avec votre système, le modèle de console et les étapes pour reproduire le problème. Joignez un exemple anonymisé si nécessaire.

La version expérimentale pour téléphone s’ouvre dans Safari ou Chrome via le lien GitHub Pages, une fois activé. Elle nécessite une connexion pour charger l’application et ses ressources. Les données des shows sont traitées dans le navigateur.
