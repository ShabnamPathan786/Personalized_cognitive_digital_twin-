import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
       
        userType: 'NORMAL',
    });

    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        // Clear field-specific error when user types
        if (errors[e.target.name]) {
            setErrors({
                ...errors,
                [e.target.name]: '',
            });
        }
        setError('');
    };

    const validateForm = () => {
        const newErrors = {};

        // Username validation
        if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, underscore and hyphen';
        }

        // Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        


        // Password validation
        if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
        } else if (!/(?=.*[0-9])/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one number';
        } else if (!/(?=.*[a-z])/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one lowercase letter';
        } else if (!/(?=.*[A-Z])/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one uppercase letter';
        } else if (!/(?=.*[@#$%^&+=])/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one special character (@#$%^&+=)';
        }

        // Confirm password validation
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            setError('Please fix the errors below');
            return;
        }

        setLoading(true);
        setError('');

        const { confirmPassword, ...registrationData } = formData;
        const result = await register(registrationData);

        if (result.success) {
            navigate('/login', { state: { successMessage:"'Registration successful! Please log in.'"}});
        } else {
            // Show detailed error message from backend
            setError(result.message || 'Registration failed. Please try again.');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
            <div className="card max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Create Account
                    </h1>
                    <p className="text-gray-600">
                        Join A Personalized Cognitive Digital Twin for Memory Support and Healthcare Assistance
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-red-800">{error}</p>
                                {Object.keys(errors).length > 0 && (
                                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                                        {Object.values(errors).map((err, idx) => (
                                            err && <li key={idx}>{err}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                                Username *
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className={`input-field ${errors.username ? 'border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Choose a username"
                                required
                            />
                            {errors.username && (
                                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email *
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`input-field ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="your@email.com"
                                required
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                            )}
                        </div>
                          {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password *
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`input-field ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Min 8 characters"
                                required
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password *
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`input-field ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Re-enter password"
                                required
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                            )}
                        </div>
                    </div>

                    {/* User Type */}
                    <div>
                        <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                            Account Type
                        </label>
                        <select
                            id="userType"
                            name="userType"
                            value={formData.userType}
                            onChange={handleChange}
                            className="input-field"
                        >
                            <option value="NORMAL">Normal User</option>
                            <option value="DEMENTIA_PATIENT">Dementia Patient</option>
                            <option value="CAREGIVER">Caregiver</option>
                        </select>
                    </div>

                    {/* Password Requirements */}
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                        <p className="font-medium mb-1">Password requirements:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li className={formData.password.length >= 8 ? 'text-green-600' : ''}>
                                At least 8 characters
                            </li>
                            <li className={/(?=.*[A-Z])/.test(formData.password) ? 'text-green-600' : ''}>
                                One uppercase letter
                            </li>
                            <li className={/(?=.*[a-z])/.test(formData.password) ? 'text-green-600' : ''}>
                                One lowercase letter
                            </li>
                            <li className={/(?=.*[0-9])/.test(formData.password) ? 'text-green-600' : ''}>
                                One number
                            </li>
                            <li className={/(?=.*[@#$%^&+=])/.test(formData.password) ? 'text-green-600' : ''}>
                                One special character (@#$%^&+=)
                            </li>
                        </ul>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating account...
                            </span>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;