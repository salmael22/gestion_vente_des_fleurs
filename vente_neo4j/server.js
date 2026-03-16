const express = require("express");
const neo4j = require("neo4j-driver");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

// Créer la connexion Neo4j
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_changez_moi";

// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token invalide" });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTHENTIFICATION ====================

// Route d'inscription CLIENT
app.post("/api/auth/register", async (req, res) => {
  const { nom, prenom, email, telephone, password } = req.body;

  if (!nom || !prenom || !email || !password) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis" });
  }

  const session = driver.session();
  try {
    const checkResult = await session.run(
      "MATCH (c:Client {email: $email}) RETURN c",
      { email }
    );

    if (checkResult.records.length > 0) {
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await session.run(
      `CREATE (c:Client {
        id: randomUUID(),
        nom: $nom,
        prenom: $prenom,
        email: $email,
        telephone: $telephone,
        password: $password,
        role: 'client',
        dateInscription: datetime()
      })
      RETURN c.id as id, c.nom as nom, c.prenom as prenom, c.email as email`,
      { nom, prenom, email, telephone: telephone || "", password: hashedPassword }
    );

    const client = result.records[0];
    const clientData = {
      id: client.get("id"),
      nom: client.get("nom"),
      prenom: client.get("prenom"),
      email: client.get("email"),
      role: 'client'
    };

    const token = jwt.sign(clientData, JWT_SECRET, { expiresIn: "24h" });

    res.status(201).json({
      message: "Compte créé avec succès",
      token,
      user: clientData
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    res.status(500).json({ error: "Erreur lors de la création du compte" });
  } finally {
    await session.close();
  }
});

// Route de connexion CLIENT
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      "MATCH (c:Client {email: $email}) RETURN c",
      { email }
    );

    if (result.records.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const client = result.records[0].get("c").properties;
    const validPassword = await bcrypt.compare(password, client.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const clientData = {
      id: client.id,
      nom: client.nom,
      prenom: client.prenom,
      email: client.email,
      role: 'client'
    };

    const token = jwt.sign(clientData, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      message: "Connexion réussie",
      token,
      user: clientData
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  } finally {
    await session.close();
  }
});

// Route de connexion ADMIN
app.post("/api/auth/admin/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  const session = driver.session();
  try {
    // Vérifier si c'est le super admin (hardcodé)
    if (email === "admin@fleurs.com" && password === "admin123") {
      const adminData = {
        id: "admin-001",
        nom: "Admin",
        prenom: "Super",
        email: "admin@fleurs.com",
        role: 'admin'
      };

      const token = jwt.sign(adminData, JWT_SECRET, { expiresIn: "24h" });

      return res.json({
        message: "Connexion admin réussie",
        token,
        user: adminData
      });
    }

    // Sinon, vérifier dans la base de données
    const result = await session.run(
      "MATCH (a:Admin {email: $email}) RETURN a",
      { email }
    );

    if (result.records.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const admin = result.records[0].get("a").properties;
    const validPassword = await bcrypt.compare(password, admin.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const adminData = {
      id: admin.id,
      nom: admin.nom,
      prenom: admin.prenom,
      email: admin.email,
      role: 'admin'
    };

    const token = jwt.sign(adminData, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      message: "Connexion admin réussie",
      token,
      user: adminData
    });
  } catch (error) {
    console.error("Erreur lors de la connexion admin:", error);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  } finally {
    await session.close();
  }
});

//Route pour récupérer les informations du client connecté
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (c:Client {id: $id})
       RETURN c.id as id, c.nom as nom, c.prenom as prenom, 
              c.email as email, c.telephone as telephone, c.adresse as adresse`,
      { id: req.user.id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    const client = result.records[0];
    res.json({
      id: client.get("id"),
      nom: client.get("nom"),
      prenom: client.get("prenom"),
      email: client.get("email"),
      telephone: client.get("telephone"),
      adresse: client.get("adresse")
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  } finally {
    await session.close();
  }
});

// ==================== GESTION DES CLIENTS ====================

// Lister tous les clients
app.get("/api/clients", authenticateToken, async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (c:Client)
       RETURN c.id as id, c.nom as nom, c.prenom as prenom, 
              c.email as email, c.telephone as telephone, c.adresse as adresse,
              c.dateInscription as dateInscription
       ORDER BY c.dateInscription DESC`
    );

    const clients = result.records.map(record => ({
      id: record.get("id"),
      nom: record.get("nom"),
      prenom: record.get("prenom"),
      email: record.get("email"),
      telephone: record.get("telephone"),
      adresse: record.get("adresse"),
      dateInscription: record.get("dateInscription")
    }));

    res.json(clients);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des clients" });
  } finally {
    await session.close();
  }
});

// Obtenir un client par ID
app.get("/api/clients/:id", authenticateToken, async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (c:Client {id: $id})
       OPTIONAL MATCH (c)-[a:ACHETE]->(p:Produit)
       RETURN c, collect({produit: p, relation: a}) as achats`,
      { id: req.params.id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    const record = result.records[0];
    const client = record.get("c").properties;
    const achats = record.get("achats")
      .filter(a => a.produit)
      .map(a => ({
        produit: a.produit.properties,
        quantite: a.relation?.properties?.quantite || 0,
        montant: a.relation?.properties?.montant || 0,
        date: a.relation?.properties?.date
      }));

    res.json({
      ...client,
      achats
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du client" });
  } finally {
    await session.close();
  }
});

app.put("/api/clients/:id", authenticateToken, async (req, res) => {
  const { nom, prenom, email, telephone, adresse } = req.body;
  const session = driver.session();
  
  try {
    const result = await session.run(
      `MATCH (c:Client {id: $id})
       SET c.nom = $nom, c.prenom = $prenom, c.email = $email, 
           c.telephone = $telephone, c.adresse = $adresse
       RETURN c`,
      { 
        id: req.params.id, 
        nom, 
        prenom, 
        email, 
        telephone: telephone || "",
        adresse: adresse || ""
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    res.json({ message: "Client modifié avec succès" });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de la modification du client" });
  } finally {
    await session.close();
  }
});

// Supprimer un client
app.delete("/api/clients/:id", authenticateToken, async (req, res) => {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (c:Client {id: $id})
       DETACH DELETE c`,
      { id: req.params.id }
    );

    res.json({ message: "Client supprimé avec succès" });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du client" });
  } finally {
    await session.close();
  }
});

// ==================== GESTION DES PRODUITS ====================

// Créer un produit
app.post("/api/products", authenticateToken, async (req, res) => {
  const { name, prix, description, categorie, stock, imageUrl, type } = req.body;

  if (!name || !prix) {
    return res.status(400).json({ error: "Nom et prix requis" });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `CREATE (p:Produit {
        id: randomUUID(),
        name: $name,
        prix: $prix,
        description: $description,
        categorie: $categorie,
        stock: $stock,
        imageUrl: $imageUrl,
        type: $type,
        dateCreation: datetime()
      })
      RETURN p`,
      { 
        name, 
        prix: parseFloat(prix), 
        description: description || "", 
        categorie: categorie || "",
        stock: parseInt(stock) || 0,
        imageUrl: imageUrl || "",
        type: type || "bouquet"
      }
    );

    const produit = result.records[0].get("p").properties;
    res.status(201).json({ message: "Produit créé avec succès", produit });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de la création du produit" });
  } finally {
    await session.close();
  }
});

// Lister tous les produits (PUBLIC - sans authentification)
app.get("/api/products/public", async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Produit)
       WHERE p.stock > 0
       RETURN p.id as id, p.name as name, p.prix as prix, 
              p.description as description, p.categorie as categorie, 
              p.stock as stock, p.imageUrl as imageUrl, p.type as type, p.dateCreation as dateCreation
       ORDER BY p.dateCreation DESC`
    );

    const products = result.records.map(record => ({
      id: record.get("id"),
      name: record.get("name"),
      prix: record.get("prix").toNumber ? record.get("prix").toNumber() : record.get("prix"),
      description: record.get("description"),
      categorie: record.get("categorie"),
      stock: record.get("stock").toNumber ? record.get("stock").toNumber() : record.get("stock"),
      imageUrl: record.get("imageUrl"),
      type: record.get("type"),
      dateCreation: record.get("dateCreation")
    }));

    res.json(products);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur de base de données" });
  } finally {
    await session.close();
  }
});

// Lister tous les produits (avec authentification)
app.get("/api/products", authenticateToken, async (req, res) => {
  const { type } = req.query;
  const session = driver.session();
  try {
    const query = type 
      ? `MATCH (p:Produit {type: $type})
         RETURN p.id as id, p.name as name, p.prix as prix, 
                p.description as description, p.categorie as categorie, 
                p.stock as stock, p.imageUrl as imageUrl, p.type as type, p.dateCreation as dateCreation
         ORDER BY p.dateCreation DESC`
      : `MATCH (p:Produit)
         RETURN p.id as id, p.name as name, p.prix as prix, 
                p.description as description, p.categorie as categorie, 
                p.stock as stock, p.imageUrl as imageUrl, p.type as type, p.dateCreation as dateCreation
         ORDER BY p.dateCreation DESC`;

    const result = await session.run(query, { type });

    const products = result.records.map(record => ({
      id: record.get("id"),
      name: record.get("name"),
      prix: record.get("prix").toNumber ? record.get("prix").toNumber() : record.get("prix"),
      description: record.get("description"),
      categorie: record.get("categorie"),
      stock: record.get("stock").toNumber ? record.get("stock").toNumber() : record.get("stock"),
      imageUrl: record.get("imageUrl"),
      type: record.get("type"),
      dateCreation: record.get("dateCreation")
    }));

    res.json(products);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur de base de données" });
  } finally {
    await session.close();
  }
});

// Obtenir un produit par ID
app.get("/api/products/:id", authenticateToken, async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Produit {id: $id})
       OPTIONAL MATCH (c:Client)-[a:ACHETE]->(p)
       RETURN p, collect({client: c, relation: a}) as acheteurs`,
      { id: req.params.id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const record = result.records[0];
    const produit = record.get("p").properties;
    const acheteurs = record.get("acheteurs")
      .filter(a => a.client)
      .map(a => ({
        client: a.client.properties,
        quantite: a.relation?.properties?.quantite || 0,
        montant: a.relation?.properties?.montant || 0,
        date: a.relation?.properties?.date
      }));

    res.json({
      ...produit,
      prix: produit.prix.toNumber ? produit.prix.toNumber() : produit.prix,
      stock: produit.stock.toNumber ? produit.stock.toNumber() : produit.stock,
      acheteurs
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du produit" });
  } finally {
    await session.close();
  }
});

// Modifier un produit
app.put("/api/products/:id", authenticateToken, async (req, res) => {
  const { name, prix, description, categorie, stock, imageUrl, type } = req.body;
  const session = driver.session();
  
  try {
    const result = await session.run(
      `MATCH (p:Produit {id: $id})
       SET p.name = $name, p.prix = $prix, p.description = $description,
           p.categorie = $categorie, p.stock = $stock, p.imageUrl = $imageUrl, p.type = $type
       RETURN p`,
      { 
        id: req.params.id, 
        name, 
        prix: parseFloat(prix), 
        description: description || "",
        categorie: categorie || "",
        stock: parseInt(stock) || 0,
        imageUrl: imageUrl || "",
        type: type || "bouquet"
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    res.json({ message: "Produit modifié avec succès" });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de la modification du produit" });
  } finally {
    await session.close();
  }
});

// Supprimer un produit
app.delete("/api/products/:id", authenticateToken, async (req, res) => {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (p:Produit {id: $id})
       DETACH DELETE p`,
      { id: req.params.id }
    );

    res.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du produit" });
  } finally {
    await session.close();
  }
});

// ==================== GESTION DU PANIER ====================

// Ajouter au panier
app.post("/api/panier/add", authenticateToken, async (req, res) => {
  const { produitId, quantite } = req.body;
  const clientId = req.user.id;

  console.log('=== ADD TO CART ===');
  console.log('Client ID:', clientId);
  console.log('Produit ID:', produitId);
  console.log('Quantité:', quantite);

  if (!produitId || !quantite) {
    return res.status(400).json({ error: "Produit et quantité requis" });
  }

  const session = driver.session();
  try {
    // Vérifier le stock
    const checkStock = await session.run(
      `MATCH (p:Produit {id: $produitId})
       RETURN p.stock as stock, p.prix as prix, p.name as name`,
      { produitId }
    );

    if (checkStock.records.length === 0) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const record = checkStock.records[0];
    const stock = record.get("stock");
    const stockNumber = stock.toNumber ? stock.toNumber() : parseInt(stock);
    
    console.log('Stock disponible:', stockNumber);

    if (stockNumber < quantite) {
      return res.status(400).json({ error: "Stock insuffisant" });
    }

    // Ajouter ou mettre à jour dans le panier
    const result = await session.run(
      `MATCH (c:Client {id: $clientId}), (p:Produit {id: $produitId})
       MERGE (c)-[r:PANIER]->(p)
       ON CREATE SET r.quantite = $quantite
       ON MATCH SET r.quantite = r.quantite + $quantite
       RETURN r.quantite as quantite`,
      { clientId, produitId, quantite: parseInt(quantite) }
    );

    const newQty = result.records[0].get("quantite");
    const newQtyNumber = newQty.toNumber ? newQty.toNumber() : parseInt(newQty);

    console.log('Nouvelle quantité dans le panier:', newQtyNumber);

    res.json({ 
      message: "Produit ajouté au panier",
      quantite: newQtyNumber
    });
  } catch (error) {
    console.error("Erreur détaillée:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({ 
      error: "Erreur lors de l'ajout au panier",
      details: error.message 
    });
  } finally {
    await session.close();
  }
});

// Voir le panier
app.get("/api/panier", authenticateToken, async (req, res) => {
  const clientId = req.user.id;
  const session = driver.session();
  
  console.log('=== GET CART ===');
  console.log('Client ID:', clientId);
  
  try {
    const result = await session.run(
      `MATCH (c:Client {id: $clientId})-[r:PANIER]->(p:Produit)
       RETURN p.id as id, p.name as name, p.prix as prix, p.stock as stock,
              p.categorie as categorie, p.imageUrl as imageUrl, 
              p.type as type, r.quantite as quantite`,
      { clientId }
    );

    const panier = result.records.map(record => {
      const prix = record.get("prix");
      const stock = record.get("stock");
      const quantite = record.get("quantite");
      
      return {
        id: record.get("id"),
        name: record.get("name"),
        prix: prix.toNumber ? prix.toNumber() : parseFloat(prix),
        stock: stock.toNumber ? stock.toNumber() : parseInt(stock),
        categorie: record.get("categorie"),
        imageUrl: record.get("imageUrl"),
        type: record.get("type"),
        quantite: quantite.toNumber ? quantite.toNumber() : parseInt(quantite)
      };
    });

    const total = panier.reduce((sum, item) => sum + (item.prix * item.quantite), 0);

    console.log('Panier récupéré:', panier.length, 'items');
    console.log('Total:', total);

    res.json({ items: panier, total });
  } catch (error) {
    console.error("Erreur détaillée:", error);
    res.status(500).json({ 
      error: "Erreur lors de la récupération du panier",
      details: error.message 
    });
  } finally {
    await session.close();
  }
});

// Modifier la quantité dans le panier
app.put("/api/panier/:produitId", authenticateToken, async (req, res) => {
  const { quantite } = req.body;
  const { produitId } = req.params;
  const clientId = req.user.id;

  console.log('=== UPDATE CART ===');
  console.log('Client ID:', clientId);
  console.log('Produit ID:', produitId);
  console.log('Nouvelle quantité:', quantite);

  const session = driver.session();
  try {
    if (quantite <= 0) {
      // Supprimer du panier
      await session.run(
        `MATCH (c:Client {id: $clientId})-[r:PANIER]->(p:Produit {id: $produitId})
         DELETE r`,
        { clientId, produitId }
      );
      console.log('Produit retiré du panier');
      return res.json({ message: "Produit retiré du panier" });
    }

    // Vérifier le stock avant de mettre à jour
    const checkStock = await session.run(
      `MATCH (p:Produit {id: $produitId})
       RETURN p.stock as stock`,
      { produitId }
    );

    if (checkStock.records.length > 0) {
      const stock = checkStock.records[0].get("stock");
      const stockNumber = stock.toNumber ? stock.toNumber() : parseInt(stock);
      
      if (stockNumber < quantite) {
        return res.status(400).json({ error: `Stock insuffisant. Disponible: ${stockNumber}` });
      }
    }

    // Mettre à jour la quantité
    await session.run(
      `MATCH (c:Client {id: $clientId})-[r:PANIER]->(p:Produit {id: $produitId})
       SET r.quantite = $quantite`,
      { clientId, produitId, quantite: parseInt(quantite) }
    );

    console.log('Quantité mise à jour');
    res.json({ message: "Quantité mise à jour" });
  } catch (error) {
    console.error("Erreur détaillée:", error);
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour",
      details: error.message 
    });
  } finally {
    await session.close();
  }
});

// Vider le panier
app.delete("/api/panier", authenticateToken, async (req, res) => {
  const clientId = req.user.id;
  const session = driver.session();
  
  console.log('=== CLEAR CART ===');
  console.log('Client ID:', clientId);
  
  try {
    await session.run(
      `MATCH (c:Client {id: $clientId})-[r:PANIER]->()
       DELETE r`,
      { clientId }
    );

    console.log('Panier vidé');
    res.json({ message: "Panier vidé" });
  } catch (error) {
    console.error("Erreur détaillée:", error);
    res.status(500).json({ 
      error: "Erreur lors du vidage du panier",
      details: error.message 
    });
  } finally {
    await session.close();
  }
});

// Valider la commande (passer au paiement)
app.post("/api/panier/checkout", authenticateToken, async (req, res) => {
  const session = driver.session(); // ⚠️ Obligatoire
  const clientId = req.user.id;
  let { adresseLivraison, telephone, bouquetPersonnalise } = req.body;

  console.log('=== CHECKOUT ===');
  console.log('Client ID:', clientId);
  console.log('Adresse fournie:', adresseLivraison);
  console.log('Téléphone fourni:', telephone);
  console.log('Bouquet personnalisé:', bouquetPersonnalise ? 'OUI' : 'NON');

  try {
    const clientResult = await session.run(
      `MATCH (c:Client {id: $clientId})
       RETURN c.adresse as adresse, c.telephone as telephone`,
      { clientId }
    );

    if (clientResult.records.length > 0) {
      const clientData = clientResult.records[0];
      const clientAdresse = clientData.get("adresse");
      const clientTelephone = clientData.get("telephone");

      if (!adresseLivraison && clientAdresse) adresseLivraison = clientAdresse;
      if (!telephone && clientTelephone) telephone = clientTelephone;
    }

    // Bouquet personnalisé
    if (bouquetPersonnalise) {
      const { fleurs, nomBouquet } = bouquetPersonnalise;

      if (!fleurs || fleurs.length === 0) {
        return res.status(400).json({ error: "Le bouquet doit contenir au moins une fleur" });
      }

      let totalMontant = 0;

      for (const fleur of fleurs) {
        const checkStock = await session.run(
          `MATCH (p:Produit {id: $produitId}) RETURN p.stock as stock, p.prix as prix, p.name as name`,
          { produitId: fleur.id }
        );

        if (checkStock.records.length === 0) {
          return res.status(404).json({ error: `Fleur ${fleur.name || fleur.id} non trouvée` });
        }

        const record = checkStock.records[0];
        const stock = record.get("stock");
        const prix = record.get("prix");
        const stockNumber = stock.toNumber ? stock.toNumber() : parseInt(stock);
        const prixNumber = prix.toNumber ? prix.toNumber() : parseFloat(prix);

        if (stockNumber < fleur.quantite) {
          return res.status(400).json({ error: `Stock insuffisant pour ${record.get("name")}` });
        }

        totalMontant += prixNumber * fleur.quantite;
      }

      // Créer la vente
      const venteResult = await session.run(
        `MATCH (c:Client {id: $clientId})
         CREATE (v:Vente {
           id: randomUUID(),
           date: datetime(),
           quantite: 1,
           montant: $montant,
           adresseLivraison: $adresseLivraison,
           telephone: $telephone,
           statut: 'En attente',
           type: 'bouquet_personnalise',
           nomBouquet: $nomBouquet,
           composition: $composition
         })
         CREATE (v)-[:IMPLIQUE]->(c)
         RETURN v`,
        {
          clientId,
          montant: totalMontant,
          adresseLivraison: adresseLivraison || "",
          telephone: telephone || "",
          nomBouquet: nomBouquet || "Bouquet Personnalisé",
          composition: JSON.stringify(fleurs)
        }
      );

      for (const fleur of fleurs) {
        await session.run(
          `MATCH (c:Client {id: $clientId}), (p:Produit {id: $produitId})
           CREATE (c)-[a:ACHETE {quantite: $quantite, montant: $montant, date: datetime(), type: 'personnalise'}]->(p)
           SET p.stock = p.stock - $quantite`,
          { clientId, produitId: fleur.id, quantite: fleur.quantite, montant: fleur.prix * fleur.quantite }
        );
      }

      return res.json({
        message: "Bouquet personnalisé commandé avec succès",
        vente: venteResult.records[0].get("v").properties,
        totalMontant
      });
    }

    // Panier normal
    const panierResult = await session.run(
      `MATCH (c:Client {id: $clientId})-[r:PANIER]->(p:Produit)
       RETURN p, r.quantite as quantite`,
      { clientId }
    );

    if (panierResult.records.length === 0) {
      return res.status(400).json({ error: "Panier vide" });
    }

    let totalMontant = 0;
    const ventes = [];

    for (const record of panierResult.records) {
      const produit = record.get("p").properties;
      const quantite = record.get("quantite");
      const quantiteNumber = quantite.toNumber ? quantite.toNumber() : parseInt(quantite);
      const prix = produit.prix;
      const prixNumber = prix.toNumber ? prix.toNumber() : parseFloat(prix);
      const stock = produit.stock;
      const stockNumber = stock.toNumber ? stock.toNumber() : parseInt(stock);

      if (stockNumber < quantiteNumber) {
        return res.status(400).json({ error: `Stock insuffisant pour ${produit.name}` });
      }

      const montant = prixNumber * quantiteNumber;
      totalMontant += montant;

      const venteResult = await session.run(
        `MATCH (c:Client {id: $clientId}), (p:Produit {id: $produitId})
         CREATE (v:Vente {
           id: randomUUID(),
           date: datetime(),
           quantite: $quantite,
           montant: $montant,
           adresseLivraison: $adresseLivraison,
           telephone: $telephone,
           statut: 'En attente'
         })
         CREATE (v)-[:IMPLIQUE]->(c)
         CREATE (c)-[a:ACHETE {quantite: $quantite, montant: $montant, date: datetime()}]->(p)
         SET p.stock = p.stock - $quantite
         RETURN v`,
        { clientId, produitId: produit.id, quantite: quantiteNumber, montant, adresseLivraison: adresseLivraison || "", telephone: telephone || "" }
      );

      ventes.push(venteResult.records[0].get("v").properties);
    }

    // Vider le panier
    await session.run(
      `MATCH (c:Client {id: $clientId})-[r:PANIER]->() DELETE r`,
      { clientId }
    );

    res.json({ message: "Commande validée avec succès", ventes, totalMontant });

  } catch (error) {
    console.error("Erreur checkout:", error);
    res.status(500).json({ error: "Erreur lors de la validation de la commande", details: error.message });
  } finally {
    await session.close();
  }
});

// ==================== ANNULATION DE COMMANDE ====================
// Annuler une commande (uniquement si "En attente")
app.delete("/api/ventes/:venteId/cancel", authenticateToken, async (req, res) => {
  const { venteId } = req.params;
  const clientId = req.user.id;

  const session = driver.session();

  try {
    // Vérifier que la vente existe et appartient au client
    const checkResult = await session.run(
      `MATCH (v:Vente {id: $venteId})-[:IMPLIQUE]->(c:Client {id: $clientId})
       RETURN v.statut as statut, v.type as type, v.composition as composition, v.quantite as quantite`,
      { venteId, clientId }
    );

    if (checkResult.records.length === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    const record = checkResult.records[0];
    const statut = record.get("statut");
    const type = record.get("type");
    const composition = record.get("composition");
    const quantite = record.get("quantite");

    if (statut !== "En attente") {
      return res.status(400).json({ error: "Impossible d'annuler une commande qui n'est pas en attente" });
    }

    // Restaurer les stocks si bouquet personnalisé
    if (type === "bouquet_personnalise" && composition) {
      const fleurs = JSON.parse(composition);

      for (const fleur of fleurs) {
        // Restaurer le stock
        await session.run(
          `MATCH (p:Produit {id: $produitId})
           SET p.stock = p.stock + $quantite`,
          { produitId: fleur.id, quantite: parseInt(fleur.quantite) }
        );

        // Supprimer la relation ACHETE
        await session.run(
          `MATCH (c:Client {id: $clientId})-[a:ACHETE {venteId: $venteId}]->(p:Produit {id: $produitId})
           DELETE a`,
          { clientId, produitId: fleur.id, venteId }
        );
      }
    } else {
      // Commande normale
      const produitResult = await session.run(
        `MATCH (c:Client {id: $clientId})-[a:ACHETE {venteId: $venteId}]->(p:Produit)
         RETURN p.id as produitId, a.quantite as quantite`,
        { clientId, venteId }
      );

      for (const r of produitResult.records) {
        const produitId = r.get("produitId");
        const qtyNumber = r.get("quantite").toNumber ? r.get("quantite").toNumber() : parseInt(r.get("quantite"));

        // Restaurer le stock
        await session.run(
          `MATCH (p:Produit {id: $produitId})
           SET p.stock = p.stock + $quantite`,
          { produitId, quantite: qtyNumber }
        );

        // Supprimer la relation ACHETE
        await session.run(
          `MATCH (c:Client {id: $clientId})-[a:ACHETE {venteId: $venteId}]->(p:Produit {id: $produitId})
           DELETE a`,
          { clientId, produitId, venteId }
        );
      }
    }

    // Supprimer la vente
    await session.run(
      `MATCH (v:Vente {id: $venteId})
       DETACH DELETE v`,
      { venteId }
    );

    res.json({ message: "Commande annulée avec succès", venteId });
  } catch (error) {
    console.error("Erreur annulation commande:", error);
    res.status(500).json({ error: "Erreur lors de l'annulation de la commande", details: error.message });
  } finally {
    await session.close();
  }
});


// ==================== VISUALISATION GRAPHIQUE ====================

// Obtenir les données pour la visualisation
app.get("/api/graph", authenticateToken, async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (c:Client)-[a:ACHETE]->(p:Produit)
       RETURN c, a, p
       UNION
       MATCH (v:Vente)-[i:IMPLIQUE]->(c:Client)
       RETURN v, i, c`
    );

    const nodes = new Map();
    const edges = [];

    result.records.forEach(record => {
      const keys = record.keys;
      
      keys.forEach(key => {
        const item = record.get(key);
        
        if (item.labels) {
          // C'est un nœud
          const label = item.labels[0];
          const props = item.properties;
          
          if (!nodes.has(props.id)) {
            nodes.set(props.id, {
              id: props.id,
              label: label,
              properties: props
            });
          }
        } else if (item.type) {
          // C'est une relation
          const rel = {
            type: item.type,
            properties: item.properties,
            start: item.start,
            end: item.end
          };
          edges.push(rel);
        }
      });
    });

    res.json({
      nodes: Array.from(nodes.values()),
      edges: edges
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du graphe" });
  } finally {
    await session.close();
  }
});

// Servir les fichiers statiques
app.use(express.static("public"));

// =========================
// ROUTES : COMMANDES CLIENT
// =========================

// Récupérer les commandes d'un client
app.get("/api/ventes/client", authenticateToken, async (req, res) => {
  const clientId = req.user.id;

  console.log("=== GET CLIENT ORDERS ===");
  console.log("Client ID:", clientId);

  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (v:Vente)-[:IMPLIQUE]->(c:Client {id: $clientId})
       RETURN v.id as id, 
              v.date as date, 
              v.quantite as quantite, 
              v.montant as montant,
              v.adresseLivraison as adresseLivraison, 
              v.telephone as telephone, 
              v.statut as statut,
              v.type as type,
              v.nomBouquet as nomBouquet,
              v.composition as composition
       ORDER BY v.date DESC`,
      { clientId }
    );

    const ventes = result.records.map((record) => {
      const montant = record.get("montant");
      const quantite = record.get("quantite");

      return {
        id: record.get("id"),
        date: record.get("date"),
        quantite: quantite?.toNumber ? quantite.toNumber() : parseInt(quantite),
        montant: montant?.toNumber ? montant.toNumber() : parseFloat(montant),
        adresseLivraison: record.get("adresseLivraison"),
        telephone: record.get("telephone"),
        statut: record.get("statut"),
        type: record.get("type"),
        nomBouquet: record.get("nomBouquet"),
        composition: record.get("composition"),
      };
    });

    console.log("Commandes trouvées:", ventes.length);

    res.json(ventes);
  } catch (error) {
    console.error("Erreur détaillée:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des commandes",
      details: error.message,
    });
  } finally {
    await session.close();
  }
});

// Récupérer une commande spécifique
app.get("/api/ventes/:venteId", authenticateToken, async (req, res) => {
  const { venteId } = req.params;
  const clientId = req.user.id;

  console.log("=== GET ORDER DETAILS ===");
  console.log("Vente ID:", venteId);
  console.log("Client ID:", clientId);

  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (v:Vente {id: $venteId})-[:IMPLIQUE]->(c:Client {id: $clientId})
       RETURN v.id as id, 
              v.date as date, 
              v.quantite as quantite, 
              v.montant as montant,
              v.adresseLivraison as adresseLivraison, 
              v.telephone as telephone, 
              v.statut as statut,
              v.type as type,
              v.nomBouquet as nomBouquet,
              v.composition as composition`,
      { venteId, clientId }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    const record = result.records[0];
    const montant = record.get("montant");
    const quantite = record.get("quantite");

    const vente = {
      id: record.get("id"),
      date: record.get("date"),
      quantite: quantite?.toNumber ? quantite.toNumber() : parseInt(quantite),
      montant: montant?.toNumber ? montant.toNumber() : parseFloat(montant),
      adresseLivraison: record.get("adresseLivraison"),
      telephone: record.get("telephone"),
      statut: record.get("statut"),
      type: record.get("type"),
      nomBouquet: record.get("nomBouquet"),
      composition: record.get("composition"),
    };

    res.json(vente);
  } catch (error) {
    console.error("Erreur détaillée:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération de la commande",
      details: error.message,
    });
  } finally {
    await session.close();
  }
});

// =========================
// SERVIR LES FICHIERS STATIC
// =========================

app.use(express.static("public"));

// =========================
// DÉMARRER LE SERVEUR
// =========================

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

// Fermer la connexion Neo4j à l'arrêt du serveur
process.on("SIGINT", async () => {
  await driver.close();
  process.exit(0);
});
function openCart() {
  console.log("Ouverture du panier...");
  alert("Panier ouvert !");
}
