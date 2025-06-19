const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Sử dụng 'user' thay vì 'userId'
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      price: Number,
    },
  ],
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "cancelled"],
    default: "pending",
  },
  shippingInfo: {
    recipientName: String,
    street: String,
    district: String,
    city: String,
    phone: String,
    notes: String,
  },
  paymentMethod: { type: String, enum: ["COD"], required: true },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

// Tắt strictPopulate để tránh lỗi nếu có trường không khớp
orderSchema.set("strictPopulate", false);

module.exports = mongoose.model("Order", orderSchema);
