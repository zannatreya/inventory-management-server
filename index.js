const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
// const ObjectId  = require('mongodb');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleWare
app.use(cors());
app.use(express.json());

// verify token
const verifyJWT = (req, res, next) => {
  const email = req.query.email;
  const tokenHeader = req.headers.authentication;
  if (email) {
    if (!tokenHeader) {
      return res.status(401).send({ message: "unauthorized access." });
    }
    const token = tokenHeader.split(" ")[1];
    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(403).send({ message: "forbidden access" });
      }
      req.decoded = decoded;
      next();
    });
  } else {
    next();
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ohyrzbo.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const itemCollection = client.db("InventoryManagement").collection("items");

    // GET Items
    app.get("/items", async (req, res) => {
      const pageNo = parseInt(req.query.pageNo);
      const products = parseInt(req.query.items);
      const email = req.query.email;
      const decodedEmail = req.decoded?.email;
      let items;
      let cursor;
      if (email) {
        if (email === decodedEmail) {
          cursor = itemCollection.find({ email: email });
          items = await cursor.toArray();
        } else {
          res.status(403).send({ message: "forbidden access" });
        }
      } else {
        cursor = itemCollection.find();

        if (pageNo || products) {
          items = await cursor
            .skip(pageNo * products)
            .limit(products)
            .toArray();
        } else {
          items = await cursor.toArray();
        }
      }
      res.send(items);
    });
    app.get("/items/total", async (req, res) => {
      const total = await itemCollection.estimatedDocumentCount();
      res.send({ total });
    });
    app.get("/items/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const item = await itemCollection.findOne(query);
      res.send(item);
    });

    app.post("/login", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // POST data
    app.post("/items", async (req, res) => {
      const newItem = req.body;
      const items = await itemCollection.insertOne(newItem);
      res.send(items);
    });

    // PUT data
    app.put("/items/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBody = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: updatedBody,
      };
      const items = await itemCollection.updateOne(filter, updateDoc, options);
      res.send(items);
    });

    // DELETE data
    app.delete("/items/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const item = await itemCollection.deleteOne(query);
      res.send(item);
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", (req, res) => {
  res.send("Inventory Management server!");
});

app.listen(port, () => {
  console.log(`Inventory Management server listening on port ${port}`);
});
