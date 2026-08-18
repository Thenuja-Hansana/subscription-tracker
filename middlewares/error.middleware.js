// Every error in the app ends up here and is turned into one JSON shape:
// { success: false, error: 'what went wrong' }

// Express only treats a middleware as an error handler when it has all four parameters
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server error';

    // Mongoose: the id in the URL is not a valid MongoDB id
    if (err.name === 'CastError') {
        statusCode = 404;
        message = 'Resource not found';
    }

    // MongoDB: a field that must be unique (like email) is already taken
    if (err.code === 11000) {
        statusCode = 409;
        message = 'That value is already in use';
    }

    // Mongoose: one or more fields failed the rules in the model
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map((fieldError) => fieldError.message).join(', ');
    }

    // A 500 means a bug on our side, so log it and keep the details away from the client
    if (statusCode === 500) {
        console.error(err);
        message = 'Server error';
    }

    res.status(statusCode).json({ success: false, error: message });
};

export default errorMiddleware;
