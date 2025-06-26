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
const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let paymentCollection;
let parcelCollection;

async function run() {
  try {
    await client.connect();
    parcelCollection = client.db("parcelDB").collection("parcels");
paymentCollection = client.db("parcelDB").collection("payments");

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

app.get("/parcels/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const parcel = await parcelCollection.findOne({ _id: new ObjectId(id) });

    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }

    res.send(parcel);
  } catch (error) {
    console.error("Error fetching parcel by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.delete('/parcels/:id', async (req, res) => {
  const id = req.params.id;
  const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});



app.post('/tracking', async (req, res) => {
  try {
    const trackingUpdate = req.body; // { trackingId, status, timestamp, location }
    const result = await trackingCollection.insertOne(trackingUpdate);
    res.send(result);
  } catch (error) {
    console.error("POST /tracking error:", error);
    res.status(500).send({ error: 'Failed to add tracking update' });
  }
});


// payment related api
app.get('/payments', async (req, res) => {
  try {
    const userEmail = req.query.email;
    console.log(userEmail)

    const query = userEmail ? { email: userEmail } : {};
    const options = { sort: { paid_at: -1 } }; // Latest first
    

  const payments = await paymentCollection.find(query, options).toArray();
  res.send(payments);

    
  } catch (error) {
    console.error("Error in GET /payments:", error);
    res.status(500).send({ error: 'Failed to load payment history' });
  }
});

// app.get('/payments/user/:email', async (req, res) => {
//   const email = req.params.email;

//   try {
//     const result = await paymentCollection
//       .find({ email })
//       .sort({ paid_at: -1 }) // DESCENDING
//       .toArray();

//     res.send(result);
//   } catch (error) {
//     res.status(500).send({ error: 'Failed to load user payment history' });
//   }
// });


app.post('/payments', async (req, res) => {
  const { parcelId, email, amount, paymentMethod, transactionId } = req.body;

  

  const paymentDoc = {
    transactionId,
    email,
    parcelId,
    paymentMethod,
    amount,
    status: 'paid',
    paid_at_string: new Date().toISOString(),
    paid_at: new Date()
  };

  try {
    // Save payment history
    const paymentResult = await paymentCollection.insertOne(paymentDoc);

    // Update parcel's payment status
    const updateResult = await parcelCollection.updateOne(
      { _id: new ObjectId(parcelId) },
      { $set: { paymentStatus: 'paid' } }
    );

    res.send({
      message: 'Payment recorded and parcel updated successfully',
      insertedId: paymentResult.insertedId,
      paymentResult,
      updateResult
    });

  } catch (error) {
    console.error('Error saving payment:', error);
    res.status(500).send({ error: 'Payment failed to record' });
  }
});



app.post('/create-payment-intent', async (req, res) => {
  const amountInCents = req.body.amountInCents;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // Amount in cents
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




// Default Route
app.get("/", (req, res) => {
  res.send("📦 Parcel Server Running...");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});


