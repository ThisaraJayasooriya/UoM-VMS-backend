const errorHandler = (err, req, res, next) => {
    console.error("❌ Error:", err);
  
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
  
    // Handle specific errors
  
    // MongoDB Validation Error
    if (err.name === "ValidationError") {
      statusCode = 400;
      message = Object.values(err.errors).map((val) => val.message).join(", ");
    }
  
    // MongoDB Duplicate Key Error
    if (err.code === 11000) {
      statusCode = 400;
      const field = Object.keys(err.keyValue);
      message = `Duplicate field value entered: ${field}`;
    }
  
    // JWT Error (invalid token)
    if (err.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token, please log in again.";
    }
  
    // JWT Expired Error
    if (err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token has expired, please log in again.";
    }
  
    res.status(statusCode).json({
      success: false,
      statusCode,
      message,
    });
  };
  
  export default errorHandler;
  