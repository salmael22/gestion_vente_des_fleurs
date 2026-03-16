# 🌸 Vente Fleurs — Application Web avec Neo4j

Application de vente de fleurs et bouquets en ligne, construite avec **Node.js / Express** et **Neo4j** comme base de données graphe.

---

## 📁 Structure du projet

```
vente_neo4j/
├── public/               # Pages HTML (frontend statique)
│   ├── index.html        # Page d'accueil
│   ├── landing.html      # Landing page
│   ├── auth.html         # Connexion / Inscription client
│   ├── dashboard.html    # Tableau de bord client
│   ├── bouquets.html     # Catalogue bouquets
│   ├── bouquet.html      # Détail d'un bouquet
│   ├── fleurs.html       # Catalogue fleurs
│   ├── custom-bouquet.html # Créateur de bouquet personnalisé
│   ├── orders.html       # Commandes du client
│   ├── profile.html      # Profil client
│   ├── graph.html        # Visualisation du graphe Neo4j
│   ├── admin-auth.html   # Connexion admin
│   ├── admin-dashboard.html # Tableau de bord admin
│   ├── clients.html      # Gestion clients (admin)
│   ├── products.html     # Gestion produits (admin)
│   └── ventes.html       # Gestion ventes (admin)
├── server.js             # Serveur Express + API REST
├── .env                  # Variables d'environnement
└── package.json
```

---

## ⚙️ Prérequis

- [Node.js](https://nodejs.org/) v18+
- [Neo4j Desktop](https://neo4j.com/download/) ou Neo4j AuraDB (instance active)

---

## 🚀 Installation

```bash
# 1. Cloner le projet
git clone <url-du-repo>
cd vente_neo4j

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
# Éditer le fichier .env
```

---

## 🔧 Configuration `.env`

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=votre_mot_de_passe

ADMIN_EMAIL=admin@store.com
ADMIN_PASSWORD=admin123

PORT=3000
```

---

## ▶️ Lancement

```bash
npm start
```

L'application sera disponible sur : [http://localhost:3000](http://localhost:3000)

---

## 🔐 Authentification

| Rôle   | Email              | Mot de passe |
|--------|--------------------|--------------|
| Admin  | admin@fleurs.com   | admin123     |
| Client | (inscription libre) | —           |

Les tokens JWT sont valables **24h**.

---

## 📡 API REST

### Authentification
| Méthode | Route                    | Description              |
|---------|--------------------------|--------------------------|
| POST    | `/api/auth/register`     | Inscription client       |
| POST    | `/api/auth/login`        | Connexion client         |
| POST    | `/api/auth/admin/login`  | Connexion admin          |
| GET     | `/api/auth/me`           | Profil du client connecté |

### Clients (authentifié)
| Méthode | Route              | Description         |
|---------|--------------------|---------------------|
| GET     | `/api/clients`     | Lister les clients  |
| GET     | `/api/clients/:id` | Détail d'un client  |
| PUT     | `/api/clients/:id` | Modifier un client  |
| DELETE  | `/api/clients/:id` | Supprimer un client |

### Produits
| Méthode | Route                   | Description                    |
|---------|-------------------------|--------------------------------|
| GET     | `/api/products/public`  | Produits disponibles (public)  |
| GET     | `/api/products`         | Tous les produits (auth)       |
| POST    | `/api/products`         | Créer un produit               |
| PUT     | `/api/products/:id`     | Modifier un produit            |
| DELETE  | `/api/products/:id`     | Supprimer un produit           |

### Panier (authentifié)
| Méthode | Route                      | Description                        |
|---------|----------------------------|------------------------------------|
| GET     | `/api/panier`              | Voir le panier                     |
| POST    | `/api/panier/add`          | Ajouter un produit                 |
| PUT     | `/api/panier/:produitId`   | Modifier la quantité               |
| DELETE  | `/api/panier`              | Vider le panier                    |
| POST    | `/api/panier/checkout`     | Valider la commande                |

### Commandes (authentifié)
| Méthode | Route                          | Description               |
|---------|--------------------------------|---------------------------|
| GET     | `/api/ventes/client`           | Commandes du client       |
| GET     | `/api/ventes/:venteId`         | Détail d'une commande     |
| DELETE  | `/api/ventes/:venteId/cancel`  | Annuler une commande      |

### Graphe
| Méthode | Route       | Description                        |
|---------|-------------|------------------------------------|
| GET     | `/api/graph`| Données pour visualisation Neo4j   |

---

## 🗃️ Modèle de données Neo4j

**Nœuds :**
- `Client` — id, nom, prenom, email, telephone, adresse, password, role, dateInscription
- `Produit` — id, name, prix, description, categorie, stock, imageUrl, type, dateCreation
- `Vente` — id, date, quantite, montant, adresseLivraison, telephone, statut, type, nomBouquet, composition

**Relations :**
- `(Client)-[:ACHETE]->(Produit)` — quantite, montant, date
- `(Client)-[:PANIER]->(Produit)` — quantite
- `(Vente)-[:IMPLIQUE]->(Client)`

---

## 🛠️ Stack technique

- **Backend** : Node.js, Express
- **Base de données** : Neo4j (via `neo4j-driver`)
- **Auth** : JWT (`jsonwebtoken`) + hachage mot de passe (`bcrypt`)
- **Frontend** : HTML / CSS / JS vanilla (fichiers statiques servis par Express)
