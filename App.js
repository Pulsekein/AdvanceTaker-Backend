require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const DataBase = require("./Database");
const app = express();

app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));


app.post("/booking", async (req, res) => {
    const { name, date, contact, paidAmount, totalAmount, item } = req.body;
  
    try {
      const newBooking = new DataBase({
        name,
        date,
        contact,
        paidAmount,
        totalAmount,
        item,
      });
  
      await newBooking.save();
      res.status(201).json({ message: "Booking saved successfully", data: newBooking });
    } catch (error) {
      console.error("Booking save error:", error);
      res.status(500).json({ message: "Error in Booking", error: error.message });
    }
});

app.get("/home", async (req, res) => {
    try {
      const today = new Date();
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(today.getDate() - 30);
  
      const twentyDaysAhead = new Date();
      twentyDaysAhead.setDate(today.getDate() + 20);
  
      
      const todayStr = today.toISOString().split('T')[0]; 
      const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0];
      const twentyDaysAheadStr = twentyDaysAhead.toISOString().split('T')[0]; 
  
      const recentBookings = await DataBase.find({
        date: { $gte: tenDaysAgoStr, $lte: twentyDaysAheadStr },
      }).sort({ date: -1 });
  
      res.status(200).json(recentBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Error fetching recent bookings" });
    }
});
  
app.get("/booking/:id", async (req, res) => {
    try {
      const booking = await DataBase.findById(req.params.id);
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Error fetching booking details" });
    }
});
  
app.delete("/booking/:id", async(req, res) =>{
    try {
        const deletedBooking = await DataBase.findByIdAndDelete(req.params.id);
    
        if (!deletedBooking) {
          return res.status(404).json({ message: "Booking not found" });
        }
        res.status(200).json({ message: "Booking deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting booking" });
    }
});
  
app.get("/history", async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const addParsedFields = {
      $addFields: {
        parsedDate: {
          $cond: {
            if: { $eq: [{ $type: "$date" }, "string"] },
            then: { $dateFromString: { dateString: "$date" } },
            else: "$date"
          }
        },
        parsedAmount: {
          $cond: {
            if: { $eq: [{ $type: "$totalAmount" }, "string"] },
            then: { $toDouble: "$totalAmount" },
            else: "$totalAmount"
          }
        }
      }
    };

    const yearlyTotals = await DataBase.aggregate([
      addParsedFields,
      {
        $group: {
          _id: { $year: "$parsedDate" },
          totalAmount: { $sum: "$parsedAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthlyTotals = await DataBase.aggregate([
      addParsedFields,
      {
        $match: {
          parsedDate: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$parsedDate" },
          totalAmount: { $sum: "$parsedAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      yearlyTotals,
      monthlyTotals
    });

  } catch (error) {
    console.error("Error fetching booking history:", error);
    res.status(500).json({ message: "Error fetching booking history" });
  }
});

app.get("/fetchAmount", async (req, res) => {
  try {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const addParsedFields = {
      $addFields: {
        parsedDate: {
          $cond: {
            if: { $eq: [{ $type: "$date" }, "string"] },
            then: { $dateFromString: { dateString: "$date" } },
            else: "$date"
          }
        },
        parsedAmount: {
          $cond: {
            if: { $eq: [{ $type: "$totalAmount" }, "string"] },
            then: { $toDouble: "$totalAmount" },
            else: "$totalAmount"
          }
        }
      }
    };

    const totalYearMoney = await DataBase.aggregate([
      addParsedFields,
      {
        $match: {
          parsedDate: { $gte: startOfYear, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$parsedAmount" }
        }
      }
    ]);

    const totalMonthMoney = await DataBase.aggregate([
      addParsedFields,
      {
        $match: {
          parsedDate: { $gte: startOfMonth, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$parsedAmount" }
        }
      }
    ]);

    const totalWeekMoney = await DataBase.aggregate([
      addParsedFields,
      {
        $match: {
          parsedDate: { $gte: startOfWeek, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$parsedAmount" }
        }
      }
    ]);

    res.status(200).json({
      totalYearMoney: totalYearMoney.length ? totalYearMoney[0].totalAmount : 0,
      totalMonthMoney: totalMonthMoney.length ? totalMonthMoney[0].totalAmount : 0,
      totalWeekMoney: totalWeekMoney.length ? totalWeekMoney[0].totalAmount : 0,
    });
  } catch (error) {
    console.error("Error fetching amounts:", error);
    res.status(500).json({ message: "Error fetching amounts" });
  }
});

app.put("/booking/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const updatedBooking = await DataBase.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ message: "Error updating booking" });
  }
});

app.get("/completeBooking/:id", async (req, res) => {
  try {
    const booking = await DataBase.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.isComplete = !booking.isComplete;
    await booking.save();

    res.status(200).json({ message: "Booking marked as complete", booking });
  } catch (error) {
    res.status(500).json({ message: "Error completing booking", error });
  }
});
  
  




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});