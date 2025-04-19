import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";

// Visitor Signup Schema
const visitorSignupSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: "Invalid email format",
      },
    },
    phoneNumber: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          return /^(?:\+94|94|0)?7\d{8}$/.test(value);
        },
        message: "Invalid Sri Lankan phone number format",
      },
    },
    nationality: {
      type: String,
      required: true,
      enum: ["Sri Lankan", "Foreigner"],
    },
    nicNumber: {
      type: String,
      required: function() {
        return this.nationality === "Sri Lankan";
      },
      unique: true,
      sparse: true, // Allows multiple null values
      validate: {
        validator: function(value) {
          if (this.nationality === "Sri Lankan") {
            return /^(\d{9}[VXvx]|\d{12})$/.test(value);
          }
          return true;
        },
        message: "Invalid NIC format (use 123456789V or 200012345678)"
      }
    },
    passportNumber: {
      type: String,
      required: function() {
        return this.nationality === "Foreigner";
      },
      unique: true,
      sparse: true, // Allows multiple null values
      validate: {
        validator: function(value) {
          if (this.nationality === "Foreigner") {
            return /^[A-Za-z0-9]{5,20}$/.test(value);
          }
          return true;
        },
        message: "Passport number must be 5-20 alphanumeric characters"
      }
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to hash the password before saving
visitorSignupSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Ensure either nicNumber or passportNumber is set based on nationality
    if (this.nationality === "Sri Lankan") {
      this.passportNumber = undefined; // Use undefined instead of null
    } else {
      this.nicNumber = undefined;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

const VisitorSignup = mongoose.model("VisitorSignup", visitorSignupSchema);

export default VisitorSignup;