"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRefreshToken = exports.validateVerifyEmail = exports.validateResetPassword = exports.validateForgotPassword = exports.validateLogin = exports.validateSignup = void 0;
const validateSignup = (req, res, next) => {
    const { firstName, lastName, username, email, phoneNumber, country, currency, accountType, pin, password, confirmPassword, agreedToTerms } = req.body;
    const errors = [];
    if (!firstName || firstName.toString().trim().length < 2)
        errors.push('First name must be at least 2 characters');
    if (!lastName || lastName.toString().trim().length < 2)
        errors.push('Last name must be at least 2 characters');
    if (!username || username.toString().trim().length < 3)
        errors.push('Username must be at least 3 characters');
    if (!email)
        errors.push('Email is required');
    if (!phoneNumber)
        errors.push('Phone number is required');
    if (!country)
        errors.push('Country is required');
    if (!currency)
        errors.push('Currency is required');
    if (!accountType)
        errors.push('Account type is required');
    if (!pin)
        errors.push('PIN is required');
    if (!password)
        errors.push('Password is required');
    if (!confirmPassword)
        errors.push('Confirm password is required');
    if (!agreedToTerms)
        errors.push('You must agree to terms and services');
    if (errors.length > 0) {
        res.status(400).json({ success: false, message: 'Validation errors', errors });
        return;
    }
    next();
};
exports.validateSignup = validateSignup;
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    if (!email) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
    }
    if (!password) {
        res.status(400).json({ success: false, message: 'Password is required' });
        return;
    }
    next();
};
exports.validateLogin = validateLogin;
const validateForgotPassword = (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
    }
    next();
};
exports.validateForgotPassword = validateForgotPassword;
const validateResetPassword = (req, res, next) => {
    const { token, email, newPassword, confirmPassword } = req.body;
    const errors = [];
    if (!token)
        errors.push('Token is required');
    if (!email)
        errors.push('Email is required');
    if (!newPassword)
        errors.push('New password is required');
    if (!confirmPassword)
        errors.push('Confirm password is required');
    if (errors.length > 0) {
        res.status(400).json({ success: false, message: 'Validation errors', errors });
        return;
    }
    next();
};
exports.validateResetPassword = validateResetPassword;
const validateVerifyEmail = (req, res, next) => {
    const { token, email } = req.body;
    if (!token) {
        res.status(400).json({ success: false, message: 'Token is required' });
        return;
    }
    if (!email) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
    }
    next();
};
exports.validateVerifyEmail = validateVerifyEmail;
const validateRefreshToken = (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token is required' });
        return;
    }
    next();
};
exports.validateRefreshToken = validateRefreshToken;
