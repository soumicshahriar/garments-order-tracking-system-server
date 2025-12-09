const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const port = process.env.PORT || 3000;

// generate tracking id
function generateTrackingId() {
  const prefix = "ORD";
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // 20251207
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 chars
  return `${prefix}-${datePart}-${randomPart}`;
}

// middle ware
app.use(cors());
app.use(express.json());

// mongodb connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ays7mdq.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // database and collections
    const myDB = client.db("garments");
    const usersCollection = myDB.collection("users");
    const allProductsCollection = myDB.collection("all-products");
    const ordersCollection = myDB.collection("orders");
    const paymentsCollection = myDB.collection("payments");

    //

    // here will be my API
    // -----------------------
    // USERS RELATED APIS
    // -----------------------

    // GET all users
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query.email = email;
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // get user role
    app.get("/users/:email/role", async (req, res) => {
      try {
        const email = req.params.email;

        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        // Find user by email
        const user = await usersCollection.findOne({ email: email });

        if (!user) {
          return res.json({ role: "guest" });
        }

        // If user exists, return role
        res.json({ role: user.role || "user" });
      } catch (error) {
        console.error("Error fetching role:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // get user by status suspend
    app.get("/users/:email/suspend", async (req, res) => {
      try {
        const email = req.params.email;

        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        // Find user by email
        const user = await usersCollection.findOne({ email: email });

        if (!user) {
          return res.json({ role: "guest" });
        }

        // If user exists, return role
        res.json({ status: user.status || "user" });
      } catch (error) {
        console.error("Error fetching status:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // POST new user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //GET a single user
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = await usersCollection.findOne(query);
      res.send(result);
    });

    // UPDATE user role
    app.patch("/users/update-role/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;

      if (!role) {
        return res.status(400).send({ message: "Role is Required" });
      }

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = { $set: { role } };

      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // UPDATE USER STATUS (approve / suspend / pending)
    // app.patch("/users/update-status/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const { status } = req.body;

    //   if (!status) {
    //     return res.status(400).send({ message: "Status is required" });
    //   }

    //   const filter = { _id: new ObjectId(id) };
    //   const updateDoc = { $set: { status } };

    //   const result = await usersCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    // });
    app.patch("/users/update-status/:id", async (req, res) => {
      const id = req.params.id;
      const { status, reason, feedback } = req.body;

      if (!status) {
        return res.status(400).send({ message: "Status is required" });
      }

      try {
        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: {
            status,
            // Only save reason & feedback if suspended
            ...(status === "suspended" && {
              suspendReason: reason || "Not provided",
              suspendFeedback: feedback || "",
              suspendedAt: new Date(),
            }),
          },
          // If status is approved, remove previous suspension details
          ...(status === "approved" && {
            $unset: {
              suspendReason: "",
              suspendFeedback: "",
              suspendedAt: "",
            },
          }),
        };

        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update status", error });
      }
    });

    // DELETE USER
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    //

    // -----------------------
    // PRODUCTS RELATED APIS
    // -----------------------
    // get all products
    app.get("/all-products", async (req, res) => {
      const limit = Number(req.query.limit);
      const homeOnly = req.query.homeOnly === "true";

      const filter = {};
      if (homeOnly) filter.showOnHome = true;

      let cursor = allProductsCollection.find(filter);

      if (limit) cursor = cursor.limit(limit);

      const result = await cursor.toArray();
      res.send(result);
    });

    // get product by id
    app.get("/all-products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      // If limit is NOT a valid number, don't apply limit
      const result = await allProductsCollection.findOne(query);

      // const result = await cursor.toArray();
      res.send(result);
    });

    // single products by id
    app.get("/single-products/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = { _id: new ObjectId(id) };

        const product = await allProductsCollection.findOne(query);

        if (!product) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send(product);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error fetching product" });
      }
    });

    // get products by email
    app.get("/products", async (req, res) => {
      const email = req.query.email;
      const query = { "managerInfo.managerEmail": email };
      const result = await allProductsCollection.find(query).toArray();
      res.send(result);
    });

    // post products
    app.post("/products", async (req, res) => {
      const productData = req.body;
      productData.status = "active";
      const result = await allProductsCollection.insertOne(productData);
      res.send(result);
    });

    // update product
    app.patch("/products/update/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      const updateDoc = {
        $set: {
          ...updatedData,
          updatedAt: new Date(),
        },
      };

      const result = await allProductsCollection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc
      );

      res.send(result);
    });

    // UPDATE product for show on home
    app.patch("/products/show-home/:id", async (req, res) => {
      const id = req.params.id;
      const { value } = req.body; // true/false

      const result = await allProductsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { showOnHome: value } }
      );

      res.send(result);
    });

    // update products
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          ...data,
        },
      };

      const result = await allProductsCollection.updateOne(filter, updatedData);
      res.send(result);
    });

    // DELETE product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await allProductsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // -----------------------
    // ORDER RELATED APIS
    // -----------------------

    // get orders
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query.buyerEmail = email;
      }
      const result = await ordersCollection
        .find(query)
        .sort({ orderTime: -1 })
        .toArray();
      res.send(result);
    });

    // post order
    app.post("/orders", async (req, res) => {
      const data = req.body;
      console.log(data.paymentMethod);
      const paymentStatus =
        data?.paymentMethod === "PayFast" ? "pending" : "confirmed";
      const orderData = {
        ...data,
        status: paymentStatus,
        orderStatus: "Pending",
        orderTime: new Date(),
      };
      console.log(orderData);

      const result = await ordersCollection.insertOne(orderData);
      res.send({
        success: true,
        orderId: result.insertedId,
        paymentRequired: data?.paymentMethod === "PayFast",
      });
    });

    // delete orders
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const result = await ordersCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // pending order related apis
    // get pending order
    app.get("/orders/pending", async (req, res) => {
      const orderStatus = req.query.orderStatus;
      const query = { orderStatus: orderStatus };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    // get pending order and decrease the availableQuantity after approve
    app.patch("/orders/approve/:id", async (req, res) => {
      const id = req.params.id;

      try {
        // 1. Find the order
        const order = await ordersCollection.findOne({ _id: new ObjectId(id) });

        if (!order) {
          return res.status(404).send({ message: "Order not found" });
        }

        // 2. Find product
        const product = await allProductsCollection.findOne({
          _id: new ObjectId(order.productId),
        });

        if (!product) {
          return res.status(404).send({ message: "Product not found" });
        }

        // 3. Calculate new qty
        const updatedQty = product.availableQuantity - order.quantity;

        if (updatedQty < 0) {
          return res.status(400).send({ message: "Not enough stock!" });
        }

        // 4. Update product quantity
        await allProductsCollection.updateOne(
          { _id: new ObjectId(order.productId) },
          { $set: { availableQuantity: updatedQty } }
        );

        // 5. Update order status
        await ordersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { orderStatus: "Approved", approvedAt: new Date() } }
        );

        res.send({ message: "Order approved & quantity updated" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    // orders rejected
    app.patch("/orders/reject/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const update = {
        $set: {
          orderStatus: "Rejected",
          rejectedAt: new Date(),
        },
      };

      const result = await ordersCollection.updateOne(filter, update);
      res.send(result);
    });

    // approve orders related api
    // get approve orders
    app.get("/orders/approve", async (req, res) => {
      const orderStatus = req.query.orderStatus;
      const query = { orderStatus: orderStatus };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    // create a tracking array inside each order
    app.post("/tracking/:orderId", async (req, res) => {
      const id = req.params.orderId;
      const tracking = req.body;

      const filter = { _id: new ObjectId(id) };

      const update = {
        $push: {
          tracking: tracking,
        },
      };

      const result = await ordersCollection.updateOne(filter, update);
      res.send(result);
    });

    // get trackings timeline for an order
    app.get("/tracking/:orderId", async (req, res) => {
      const id = req.params.orderId;
      const order = await ordersCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(order?.tracking || []);
    });

    // get orders for buyer to track their product
    app.get("/orders/:id", async (req, res) => {
      const orderId = req.params.id;
      const filter = { _id: new ObjectId(orderId) };
      const result = await ordersCollection.findOne(filter);
      res.send(result);
    });

    // -----------------------
    // Payment RELATED APIS
    // -----------------------

    // crete payment session
    app.post("/create-payment-session", async (req, res) => {
      const { orderId } = req.body;
      const order = await ordersCollection.findOne({
        _id: new ObjectId(orderId),
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: order.buyerEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: order.productTitle },
              unit_amount: order.totalPrice * 100,
            },
            quantity: order.quantity,
          },
        ],
        mode: "payment",
        metadata: { orderId, productTitle: order.productTitle },
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/my-orders`,
      });

      res.send({ url: session.url });
    });

    // payment success
    app.patch("/payment-success", async (req, res) => {
      const sessionId = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log(session);
      const trackingId = generateTrackingId();

      // prevent the duplicate entry
      const transactionId = session.payment_intent;
      const query = { transactionId: transactionId };
      const isExist = await paymentsCollection.findOne(query);
      if (isExist) {
        return;
      }

      if (session.payment_status === "paid") {
        const id = session.metadata.orderId;
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            status: "paid",
            trackingId: trackingId,
          },
        };

        const result = await ordersCollection.updateOne(query, updatedDoc);

        // order history
        const orderInfo = {
          amount: session.amount_total / 100,
          currency: session.currency,
          buyerEmail: session.customer_details.email,
          buyerName: session.customer_details.name,
          orderId: session.metadata.orderId,
          productTitle: session.metadata.productTitle,
          transactionId: session.payment_intent,
          trackingId: trackingId,
          paymentStatus: session.payment_status,
          paidAt: new Date(),
        };

        const resultPayment = await paymentsCollection.insertOne(orderInfo);
        res.send({
          success: true,
          result,
          trackingId: trackingId,
          transactionId: session.payment_intent,
          paymentInfo: resultPayment,
        });
        // console.log("session retrieve", session);
        // res.send({ success: true, result });
      }
      res.send({ success: false });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("garments order tracker system");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
