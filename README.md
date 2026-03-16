# 🌸 Vente de Fleurs — Application Web avec Neo4j

Application web de **vente de fleurs et de bouquets en ligne** développée avec **Node.js**, **Express** et **Neo4j** comme base de données graphe.
Cette application permet aux utilisateurs de consulter un catalogue de fleurs, créer des bouquets personnalisés et passer des commandes, tandis que les administrateurs peuvent gérer les produits, les clients et les ventes via un tableau de bord.

---

# 📌 Objectif du projet

L’objectif de cette application est de proposer une plateforme simple et efficace pour :

* vendre des fleurs et bouquets en ligne
* permettre aux clients de gérer leurs commandes
* offrir aux administrateurs un système de gestion complet
* exploiter les avantages d’une **base de données graphe Neo4j** pour modéliser les relations entre clients, produits et ventes

---

# 🚀 Fonctionnalités

## 👤 Espace Client

* Inscription et connexion
* Consultation du catalogue de fleurs et bouquets
* Visualisation des détails d’un produit
* Création de bouquets personnalisés
* Ajout de produits au panier
* Validation des commandes
* Consultation de l’historique des commandes
* Gestion du profil utilisateur

---

## 🛠️ Espace Administrateur

* Connexion sécurisée
* Gestion des clients
* Gestion des produits (ajout, modification, suppression)
* Consultation des ventes
* Tableau de bord administrateur
* Visualisation du graphe Neo4j

---

# 🏗️ Structure du projet

```
vente_neo4j/
│
├── public/
│   ├── index.html
│   ├── landing.html
│   ├── auth.html
│   ├── dashboard.html
│   ├── bouquets.html
│   ├── bouquet.html
│   ├── fleurs.html
│   ├── custom-bouquet.html
│   ├── orders.html
│   ├── profile.html
│   ├── graph.html
│
│   ├── admin-auth.html
│   ├── admin-dashboard.html
│   ├── clients.html
│   ├── products.html
│   └── ventes.html
│
├── server.js
├── package.json
└── .env
```

---

# ⚙️ Technologies utilisées

## Backend

* Node.js
* Express.js
* JWT Authentication
* bcrypt (hashage des mots de passe)

## Base de données

* Neo4j
* neo4j-driver

## Frontend

* HTML5
* CSS3
* JavaScript (Vanilla)

---

# 🗃️ Modèle de données Neo4j

## Nœuds

### Client

* id
* nom
* prenom
* email
* telephone
* adresse
* password
* role
* dateInscription

### Produit

* id
* name
* prix
* description
* categorie
* stock
* imageUrl
* type
* dateCreation

### Vente

* id
* date
* quantite
* montant
* adresseLivraison
* telephone
* statut
* type
* nomBouquet
* composition

---

## Relations

```
(Client)-[:ACHETE]->(Produit)
(Client)-[:PANIER]->(Produit)
(Vente)-[:IMPLIQUE]->(Client)
```

Ces relations permettent de représenter facilement les interactions entre les utilisateurs et les produits dans Neo4j.

---

# 🔧 Installation

## 1️⃣ Cloner le projet

```bash
git clone https://github.com/votre-repository/vente_neo4j.git
cd vente_neo4j
```

## 2️⃣ Installer les dépendances

```bash
npm install
```

## 3️⃣ Configurer les variables d’environnement

Créer un fichier `.env`

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password

ADMIN_EMAIL=admin@fleurs.com
ADMIN_PASSWORD=admin123

PORT=3000
```

---

# ▶️ Lancer l’application

```bash
npm start
```

L’application sera accessible sur :

```
http://localhost:3000
```

---

# 🔐 Authentification

| Rôle   | Email                                       | Mot de passe |
| ------ | ------------------------------------------- | ------------ |
| Admin  | [admin@fleurs.com](mailto:admin@fleurs.com) | admin123     |
| Client | Inscription libre                           | —            |

Les tokens **JWT** sont valables **24 heures**.

---

# 📡 API REST

## Authentification

| Méthode | Endpoint                | Description        |
| ------- | ----------------------- | ------------------ |
| POST    | `/api/auth/register`    | Inscription client |
| POST    | `/api/auth/login`       | Connexion client   |
| POST    | `/api/auth/admin/login` | Connexion admin    |
| GET     | `/api/auth/me`          | Profil utilisateur |

---

## Produits

| Méthode | Endpoint               | Description          |
| ------- | ---------------------- | -------------------- |
| GET     | `/api/products/public` | Produits publics     |
| GET     | `/api/products`        | Liste des produits   |
| POST    | `/api/products`        | Ajouter un produit   |
| PUT     | `/api/products/:id`    | Modifier un produit  |
| DELETE  | `/api/products/:id`    | Supprimer un produit |

---

## Panier

| Méthode | Endpoint                 |
| ------- | ------------------------ |
| GET     | `/api/panier`            |
| POST    | `/api/panier/add`        |
| PUT     | `/api/panier/:produitId` |
| DELETE  | `/api/panier`            |
| POST    | `/api/panier/checkout`   |

---

## Commandes

| Méthode | Endpoint                      | Description           |
| ------- | ----------------------------- | --------------------- |
| GET     | `/api/ventes/client`          | Commandes du client   |
| GET     | `/api/ventes/:venteId`        | Détail d'une commande |
| DELETE  | `/api/ventes/:venteId/cancel` | Annuler une commande  |

---

# 📊 Visualisation du Graphe

Une page dédiée permet de **visualiser les données Neo4j sous forme de graphe interactif**, afin de mieux comprendre les relations entre :

* clients
* produits
* ventes

---

# 📈 Améliorations futures

* Paiement en ligne
* Système de recommandation de bouquets
* Notifications de commandes
* Tableau de bord analytique
* Interface frontend avec React ou Vue.js

---

# 👩‍💻 Auteur

Projet réalisé dans le cadre d’un projet académique sur le développement d’applications web utilisant **Node.js et Neo4j**.
