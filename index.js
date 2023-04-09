const express = require("express");
const cors = require("cors");

const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5xecsyp.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoryOption = client.db("Computer-Zone").collection("Category");
    const productCategory = client
      .db("Computer-Zone")
      .collection("product-category");

    const userCollection = client
      .db("Computer-Zone")
      .collection("userCollection");

    const orderCollections = client.db("Computer-Zone").collection("bookings");
    const wishListCollection = client
      .db("Computer-Zone")
      .collection("wishlist");
    const advertisementCollection = client
      .db("Computer-Zone")
      .collection("advertisement");
    const paymentsCollection = client
      .db("Computer-Zone")
      .collection("payments");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;

      const query = { email: decodedEmail };
      const user = await userCollection.findOne(query);

      if (user?.userType !== "Admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // -------------------------------------------
    // -------------------------------------------
    // -------------------------------------------
    // -------------------------------------------
    // -------------------------------------------

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    // -------------------------------------------
    // -------------------------------------------
    // -------------------------------------------
    // -------------------------------------------
    // -------------------------------------------
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // only 3 service in show display
    app.get("/category", async (req, res) => {
      const query = {};
      const cursor = categoryOption.find(query);
      const services = await cursor.limit(3).toArray();
      res.send(services);
    });

    // only 3 service in show display
    app.get("/productsSort", async (req, res) => {
      const query = {};
      const cursor = productCategory.find(query);
      const services = await cursor.limit(3).toArray();
      res.send(services);
    });

    app.get("/categoryItem", async (req, res) => {
      const id = req.query.category;
      console.log(id);
      const products = await productCategory.find(query).toArray();

      res.send(products);
    });

    // all service show display
    app.get("/categoryall", async (req, res) => {
      const query = {};
      const services = await categoryOption.find(query).toArray();
      // const services = await cursor.toArray();
      res.send(services);
    });
    // all service show display
    app.get("/productAll", async (req, res) => {
      const query = {};
      const services = await productCategory.find(query).toArray();
      // const services = await cursor.toArray();
      res.send(services);
    });

    app.get("/productAll/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const services = await productCategory.find(query).toArray();
      // const services = await cursor.toArray();
      res.send(services);
    });
    app.delete("/productAll/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCategory.deleteOne(query);
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const category = req.query.category;
      const query = { category: category };
      const services = await productCategory.find(query).toArray();
      // const services = await cursor.toArray();
      res.send(services);
    });

    // adverti mongoDB te add -------------------------------------------
    app.post("/addProduct", async (req, res) => {
      const user = req.body;
      const result = await productCategory.insertOne(user);
      res.send(result);
    });
    // advertisement te add -------------------------------------------
    app.post("/advertisement", async (req, res) => {
      const user = req.body;
      const query = {};
      const deletePRo = await advertisementCollection.deleteMany(query);
      const result = await advertisementCollection.insertOne(user);
      res.send(result);
    });

    // client site show
    app.get("/advertisement", async (req, res) => {
      const query = {};
      const services = await advertisementCollection.find(query).toArray();
      res.send(services);
    });
    // client site show
    app.get("/users", async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });
    //  User with email ---------------------------------- 26.11.22
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // client site delete
    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    // admin User
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isAdmin: user?.userType === "Admin" });
    });

    // admin approved seller varified
    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "verify",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    // buyer User
    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isBuyer: user?.userType === "Buyer" });
    });
    // seller User
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isSeller: user?.userType === "Seller" });
    });
    // seller User
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isAdmin: user?.userType === "Admin" });
    });

    /* ---------------------------------------------------------------- */
    /* --------------------My booking --------------------------------- */
    /* ---------------------------------------------------------------- */

    // all orders list
    app.get("/bookings", async (req, res) => {
      const query = {};
      const order = await orderCollections.find(query).toArray();
      res.send(order);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const services = await orderCollections.findOne(query).toArray();
      res.send(services);
    });

    // app.get("/bookings/:id", async (req, res) => {
    //   const id = req.body.id;
    //   const query = { _id: id };
    //   const results = await orderCollections.findOne(query);
    //   res.send(results);
    // });

    // order delete user
    app.delete("/bookings/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollections.deleteOne(query);
      res.send(result);
    });
    // Order product (order) -------------------------------
    app.post("/bookings", async (req, res) => {
      const order = req.body;
      console.log("order post", order);
      const result = await orderCollections.insertOne(order);
      res.send(result);
    });
    /* ---------------------------------------------------------------- */
    /* --------------------My Wish List ------------------------------- */
    /* ---------------------------------------------------------------- */
    // wishlist get (my wishlist in buyer )
    app.get("/wishlist", async (req, res) => {
      const query = {};
      const wishlist = await wishListCollection.find(query).toArray();
      res.send(wishlist);
    });
    // wishlist post (productDetails)
    app.post("/wishlist", async (req, res) => {
      const wishlist = req.body;

      const result = await wishListCollection.insertOne(wishlist);
      res.send(result);
    });
    app.put("/wishlist/buyer/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          product: "order",
        },
      };
      const result = await wishListCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    /* ---------------------------------------------------------------- */
    /* --------------------My Wish List ------------------------------- */
    /* ---------------------------------------------------------------- */

    // Add product (product) -------------------------------
    app.post("/productadd", async (req, res) => {
      const productAdd = req.body;

      const product = await productCategory.insertOne(productAdd);
      res.send(product);
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", (req, res) => {
  res.send("Computer Zone Server is running");
});

app.listen(port, () => {
  console.log(`Computer Zone server on port ${port}`);
});
