import mongoose from "mongoose";

const connectDb = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://muhammedbilal6211_db_user:B543JH0b4PxcVDnT@cluster0.toqpx8k.mongodb.net/?appName=Cluster0",
    );
    console.log("Database Connected");
  } catch (error) {
    console.log(error?.message || error?.data?.message);
  }
};

export default connectDb;
