const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const authMiddleware = require("../middleware/auth");
const nodemailer = require("nodemailer");

// Cấu hình transporter cho nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Place order
router.post("/", authMiddleware, async (req, res) => {
  try {
    console.log("POST /orders - Authenticated user:", req.user._id);
    console.log("POST /orders - Request body:", req.body);
    if (!req.user) {
      console.log("POST /orders - No user, returning 401");
      return res.status(401).json({ message: "User not authenticated" });
    }
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    console.log("POST /orders - Cart:", cart);
    if (!cart || !cart.items || cart.items.length === 0) {
      console.log("POST /orders - Cart is empty");
      return res.status(400).json({ message: "Cart is empty" });
    }
    const { shippingInfo, paymentMethod } = req.body;
    if (
      !shippingInfo ||
      !shippingInfo.recipientName ||
      !shippingInfo.street ||
      !shippingInfo.district ||
      !shippingInfo.city ||
      !shippingInfo.phone
    ) {
      console.log("POST /orders - Invalid shipping info");
      return res
        .status(400)
        .json({ message: "Complete shipping information is required" });
    }
    if (paymentMethod !== "COD") {
      console.log("POST /orders - Invalid payment method:", paymentMethod);
      return res.status(400).json({ message: "Only COD is supported" });
    }
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const order = new Order({
      user: req.user._id,
      items: cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      })),
      totalPrice,
      status: "pending",
      shippingInfo,
      paymentMethod,
      paymentStatus: "pending",
    });
    await order.save();
    console.log("POST /orders - Order saved:", order);

    // Gửi email xác nhận
    const mailOptions = {
      from: `"Your Store" <${process.env.EMAIL_USER}>`,
      to: req.user.email,
      subject: `Order Confirmation #${order._id}`,
      html: `
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Dear ${req.user.email},</p>
        <p>Your order has been placed successfully!</p>
        <h3>Shipping Information</h3>
        <p><strong>Recipient:</strong> ${shippingInfo.recipientName}</p>
        <p><strong>Address:</strong> ${shippingInfo.street}, ${
        shippingInfo.district
      }, ${shippingInfo.city}</p>
        <p><strong>Phone:</strong> ${shippingInfo.phone}</p>
        ${
          shippingInfo.notes
            ? `<p><strong>Notes:</strong> ${shippingInfo.notes}</p>`
            : ""
        }
        <h3>Payment Information</h3>
        <p><strong>Method:</strong> Cash on Delivery (COD)</p>
        <p><strong>Status:</strong> Pending (Pay when receiving)</p>
        <h3>Order Details</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr style="background: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px;">Product</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
          </tr>
          ${cart.items
            .map(
              (item) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.product.name}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">$${item.product.price}</td>
            </tr>
          `
            )
            .join("")}
        </table>
        <p><strong>Total:</strong> $${totalPrice.toFixed(2)}</p>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p>Order placed on: ${new Date(order.createdAt).toLocaleString()}</p>
        <p>Thank you for shopping with us!</p>
      `,
    };
    await transporter.sendMail(mailOptions);
    console.log("POST /orders - Email sent to:", req.user.email);

    // Xóa giỏ hàng
    await Cart.findOneAndDelete({ user: req.user._id });
    console.log("POST /orders - Cart cleared for user:", req.user._id);
    res.status(201).json(order);
  } catch (error) {
    console.error("POST /orders - Error:", error);
    res
      .status(500)
      .json({ message: `Failed to place order: ${error.message}` });
  }
});

// Get user's orders
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("GET /orders - User:", req.user._id);
    const orders = await Order.find({ user: req.user._id }).populate(
      "items.product"
    );
    res.json(orders);
  } catch (error) {
    console.error("GET /orders - Error:", error);
    res.status(500).json({ message: error.message });
  }
});
// Update order status (admin only)
router.put("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  try {
    const { status } = req.body;
    if (!["pending", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
