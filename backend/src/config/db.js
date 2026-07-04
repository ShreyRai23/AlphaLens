import dns from 'dns';
import mongoose from 'mongoose';

// ─── Google DNS Resolver ───────────────────────────────────────────────────────
// Forces resolution through Google's public DNS (8.8.8.8 / 8.8.4.4) to bypass
// ISP-level DNS failures that block MongoDB Atlas SRV record lookups.
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

// ─── Mongoose Connection ───────────────────────────────────────────────────────
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      family: 4,            // Force IPv4 to complement the DNS fix
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB runtime error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};
