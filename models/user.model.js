import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minLength: [2, 'Name must be at least 2 characters'],
            maxLength: [50, 'Name must be at most 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        // This holds the hashed password, never the real one.
        // select: false keeps it out of query results unless we ask for it.
        password: {
            type: String,
            required: [true, 'Password is required'],
            select: false,
        },
    },
    // Adds createdAt and updatedAt to every user
    { timestamps: true },
);

const User = mongoose.model('User', userSchema);

export default User;
