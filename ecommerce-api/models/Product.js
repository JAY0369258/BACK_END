const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  brand: { type: String, required: true }, // Thêm trường brand với required
  image: String,
});

module.exports = mongoose.model("Product", productSchema);
