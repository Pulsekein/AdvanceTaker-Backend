require("dotenv").config();
const mongoose=require("mongoose");


mongoose.connect(process.env.URL_DB)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((error) => console.error("MongoDB connection error:", error));


const ItemSchema = new mongoose.Schema({
   name: { type: String, required: true },
   weight: { type: String, default: "0" },
   amount: { type: String, default: "0" }
});
  

const DataSchema = new mongoose.Schema({
    date: { type: String, required: true },
    name: { type: String, required: true },
    item: [ItemSchema],
    paidAmount: { type: String, default: "0" },
    totalAmount: { type: String, default: "0" },
    contact: { type: String, required: true },
    isComplete: {type: Boolean, default: false}
}, {
    timestamps: true
});


const DataBase=mongoose.model("Data",DataSchema);
module.exports=DataBase;