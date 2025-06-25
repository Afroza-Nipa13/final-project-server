const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let parcelCollection;

async function run() {
  try {
    await client.connect();
    const db = client.db("parcelDB");
    parcelCollection = db.collection("parcels");

    console.log("✅ Connected to MongoDB");

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
  }
}
run().catch(console.dir);

// ✅ GET route
app.get("/parcels", async (req, res) => {
  const parcels = await parcelCollection.find().toArray();
  res.send(parcels);
});

// ✅ POST route - now correct!
app.post("/parcels", async (req, res) => {
  try {
    const parcel = req.body;
    const result = await parcelCollection.insertOne(parcel);
    res.status(201).json({ message: "✅ Parcel added", insertedId: result.insertedId });
  } catch (err) {
    console.error("❌ Error inserting parcel:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// parcels api

app.get("/parcels", async (req, res) => {
  try {
    const userEmail = req.query.email;

    if (!userEmail) {
      return res.status(400).json({ error: "Email query parameter is required" });
    }

    const parcels = await parcelCollection
      .find({ created_by: userEmail })
      .sort({ creation_date: -1 }) // 🔽 Latest first
      .toArray();

    res.send(parcels);
  } catch (err) {
    console.error("❌ Error fetching parcels:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.delete('/parcels/:id', async (req, res) => {
  const id = req.params.id;
  const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// Default Route
app.get("/", (req, res) => {
  res.send("📦 Parcel Server Running...");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});


