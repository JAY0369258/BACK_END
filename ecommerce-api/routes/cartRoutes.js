const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const authMiddleware = require("../middleware/auth");

// Add item to cart
router.post("/", authMiddleware, async (req, res) => {
  try {
    console.log("POST /cart - Authenticated user:", req.user);
    console.log("POST /cart - Request body:", req.body);
    if (!req.user) {
      console.log("POST /cart - No user, returning 401");
      return res.status(401).json({ message: "User not authenticated" });
    }
    const { productId, quantity } = req.body;
    if (!productId || !quantity || quantity < 1) {
      console.log("POST /cart - Invalid product or quantity");
      return res.status(400).json({ message: "Invalid product or quantity" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      console.log("POST /cart - Product not found:", productId);
      return res.status(404).json({ message: "Product not found" });
    }
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
      console.log("POST /cart - Created new cart for user:", req.user._id);
    }
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }
    await cart.save();
    const populatedCart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    console.log("POST /cart - Cart saved:", populatedCart);
    res.status(200).json(populatedCart);
  } catch (error) {
    console.error("POST /cart - Error:", error);
    res
      .status(500)
      .json({ message: `Failed to add to cart: ${error.message}` });
  }
});

// Remove item from cart
router.post("/remove", authMiddleware, async (req, res) => {
  try {
    console.log("POST /cart/remove - Authenticated user:", req.user);
    console.log("POST /cart/remove - Request body:", req.body);
    if (!req.user) {
      console.log("POST /cart/remove - No user, returning 401");
      return res.status(401).json({ message: "User not authenticated" });
    }
    const { productId } = req.body;
    if (!productId) {
      console.log("POST /cart/remove - Invalid productId");
      return res.status(400).json({ message: "Product ID is required" });
    }
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      console.log("POST /cart/remove - Cart not found");
      return res.status(404).json({ message: "Cart not found" });
    }
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
    await cart.save();
    const populatedCart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    console.log("POST /cart/remove - Cart updated:", populatedCart);
    res.status(200).json(populatedCart || { user: req.user._id, items: [] });
  } catch (error) {
    console.error("POST /cart/remove - Error:", error);
    res
      .status(500)
      .json({ message: `Failed to remove item: ${error.message}` });
  }
});

// Get cart
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("GET /cart - User:", req.user._id);
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    if (!cart) {
      return res.status(200).json({ user: req.user._id, items: [] });
    }
    res.json(cart);
  } catch (error) {
    console.error("GET /cart - Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Delete cart
router.delete("/", authMiddleware, async (req, res) => {
  try {
    console.log("DELETE /cart - User:", req.user._id);
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ message: "Cart cleared" });
  } catch (error) {
    console.error("DELETE /cart - Error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
