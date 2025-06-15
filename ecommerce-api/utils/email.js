const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOrderConfirmationEmail = async (userEmail, order) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `Order Confirmation - Order #${order._id}`,
    html: `
      <h2>Thank You for Your Order!</h2>
      <p>Dear Customer,</p>
      <p>Your order has been successfully placed. Below are the details:</p>
      <h3>Order ID: ${order._id}</h3>
      <h4>Items:</h4>
      <ul>
        ${order.items
          .map(
            (item) => `
            <li>
              ${item.product.name} (Qty: ${item.quantity}) - $${item.product.price} each
            </li>
            `
          )
          .join("")}
      </ul>
      <p><strong>Total:</strong> $${order.total}</p>
      <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p>We will notify you when your order is shipped.</p>
      <p>Best regards,<br>E-commerce Store Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send order confirmation email");
  }
};

module.exports = { sendOrderConfirmationEmail };
