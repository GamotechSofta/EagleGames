import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db_Connection.js';
import Admin from '../models/admin/admin.js';
import User from '../models/user/user.js';
import { Wallet } from '../models/wallet/wallet.js';

dotenv.config();

const SEED = {
    admin: {
        username: 'seed_admin',
        password: 'Admin@123',
        role: 'super_admin',
        status: 'active',
    },
    bookie: {
        username: 'seed_bookie',
        phone: '9123456789',
        password: 'Bookie@123',
        role: 'bookie',
        status: 'active',
        email: 'seed.bookie@example.com',
    },
    user: {
        username: 'seed_user',
        email: 'seed.user@example.com',
        phone: '9234567890',
        password: 'User@123',
        role: 'user',
        source: 'super_admin',
        isActive: true,
    },
};

const hashPassword = async (plain) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plain, salt);
};

const seedUsers = async () => {
    try {
        await connectDB();

        const adminPassword = await hashPassword(SEED.admin.password);
        await Admin.findOneAndUpdate(
            { username: SEED.admin.username },
            {
                $set: {
                    username: SEED.admin.username,
                    password: adminPassword,
                    role: SEED.admin.role,
                    status: SEED.admin.status,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const bookiePassword = await hashPassword(SEED.bookie.password);
        await Admin.findOneAndUpdate(
            { $or: [{ username: SEED.bookie.username }, { phone: SEED.bookie.phone }] },
            {
                $set: {
                    username: SEED.bookie.username,
                    phone: SEED.bookie.phone,
                    email: SEED.bookie.email,
                    password: bookiePassword,
                    role: SEED.bookie.role,
                    status: SEED.bookie.status,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const userPassword = await hashPassword(SEED.user.password);
        const user = await User.findOneAndUpdate(
            { $or: [{ username: SEED.user.username }, { email: SEED.user.email }, { phone: SEED.user.phone }] },
            {
                $set: {
                    username: SEED.user.username,
                    email: SEED.user.email,
                    phone: SEED.user.phone,
                    password: userPassword,
                    role: SEED.user.role,
                    source: SEED.user.source,
                    isActive: SEED.user.isActive,
                    referredBy: null,
                    balance: 0,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await Wallet.findOneAndUpdate(
            { userId: user._id },
            { $setOnInsert: { userId: user._id, balance: 0 } },
            { upsert: true, new: true }
        );

        console.log('✅ Seed completed successfully.');
        console.log('\nAdmin (Super Admin) Login:');
        console.log(`Username: ${SEED.admin.username}`);
        console.log(`Password: ${SEED.admin.password}`);

        console.log('\nBookie Login:');
        console.log(`Phone: ${SEED.bookie.phone}`);
        console.log(`Username: ${SEED.bookie.username}`);
        console.log(`Password: ${SEED.bookie.password}`);

        console.log('\nNormal User Login:');
        console.log(`Phone: ${SEED.user.phone}`);
        console.log(`Username: ${SEED.user.username}`);
        console.log(`Password: ${SEED.user.password}`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
};

seedUsers();
