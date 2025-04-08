const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  invoiceNumber: String,
  clientName: String,
  amount: Number,
  date: String,
  status: { type: String, default: "pending" },
  filePath: String, // Local path to PDF
});

module.exports = mongoose.model("Request", requestSchema);
