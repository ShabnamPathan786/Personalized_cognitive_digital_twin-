import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProfileSetup = () => {
    const navigate = useNavigate();
    const { updateProfile } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
        caregiverId: '',
        diseaseStage: 'EARLY',
        bloodGroup: '',
        allergies: '',
        emergencyName: '',
        emergencyPhone: '',
        emergencyEmail: '',
        emergencyRelation: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    const validateStep1 = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
        else if (!/^\+?[0-9]{10,13}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
            newErrors.phoneNumber = 'Enter valid phone number (10-13 digits)';
        }
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep3 = () => {
        const newErrors = {};
        if (!formData.emergencyName.trim()) newErrors.emergencyName = 'Contact name is required';
        if (!formData.emergencyPhone.trim()) newErrors.emergencyPhone = 'Contact phone is required';
        else if (!/^\+?[0-9]{10,13}$/.test(formData.emergencyPhone.replace(/\s/g, ''))) {
            newErrors.emergencyPhone = 'Enter valid phone number (10-13 digits)';
        }
        if (!formData.emergencyRelation.trim()) newErrors.emergencyRelation = 'Relationship is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (step === 1 && validateStep1()) setStep(2);
        else if (step === 2) setStep(3);
    };

    const prevStep = () => setStep(step - 1);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!validateStep3()) return;

        setLoading(true);
        setErrors({});

        // Map frontend state to Backend Model (User.java)
        const profileData = {
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            // ✅ Send caregiverId as string - backend will add to array
            caregiverId: formData.caregiverId || null,
            preferences: {
                diseaseStage: formData.diseaseStage,
                bloodGroup: formData.bloodGroup,
                allergies: formData.allergies
            },
            // ✅ Emergency contact with correct field name 'phoneNumber'
            emergencyContacts: [{
                name: formData.emergencyName,
                relationship: formData.emergencyRelation,
                email: formData.emergencyEmail || null,
                phoneNumber: formData.emergencyPhone,
                primaryContact: true
            }]
        };

        try {
            const result = await updateProfile(profileData);
            if (result?.success) {
                navigate('/dashboard');
            } else {
                setErrors({ submit: result?.message || 'Failed to update profile' });
            }
        } catch (err) {
            console.error('Profile submission error:', err);
            setErrors({ submit: 'An error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Complete Your Profile</h2>
                    <p className="mt-2 text-gray-600">Step {step} of 3</p>
                    <div className="mt-4 h-2 w-full bg-gray-200 rounded-full">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {errors.submit && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                        {errors.submit}
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className={`mt-1 block w-full rounded-md border ${errors.fullName ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                            />
                            {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                            <input
                                type="text"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                placeholder="+91XXXXXXXXXX"
                                className={`mt-1 block w-full rounded-md border ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                            />
                            {errors.phoneNumber && <p className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Address *</label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                rows="3"
                                className={`mt-1 block w-full rounded-md border ${errors.address ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                            ></textarea>
                            {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
                        </div>
                        <button
                            onClick={nextStep}
                            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 mt-6"
                        >
                            Next Step
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Medical Information</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Caregiver ID (Optional)</label>
                            <input
                                type="text"
                                name="caregiverId"
                                value={formData.caregiverId}
                                onChange={handleChange}
                                placeholder="Enter caregiver ID if you have one"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Leave empty if you don't have a caregiver ID</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Disease Stage</label>
                            <select
                                name="diseaseStage"
                                value={formData.diseaseStage}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="EARLY">Early Stage</option>
                                <option value="MIDDLE">Middle Stage</option>
                                <option value="LATE">Late Stage</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Blood Group</label>
                            <input
                                type="text"
                                name="bloodGroup"
                                value={formData.bloodGroup}
                                onChange={handleChange}
                                placeholder="e.g. O+"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Allergies</label>
                            <input
                                type="text"
                                name="allergies"
                                value={formData.allergies}
                                onChange={handleChange}
                                placeholder="e.g. Peanuts, Penicillin"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                        </div>
                        <div className="flex space-x-4 mt-6">
                            <button
                                onClick={prevStep}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={nextStep}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Emergency Contact *</h3>
                        <p className="text-sm text-gray-500">This person will be notified in case of emergencies</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contact Name *</label>
                            <input
                                type="text"
                                name="emergencyName"
                                value={formData.emergencyName}
                                onChange={handleChange}
                                className={`mt-1 block w-full rounded-md border ${errors.emergencyName ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                            />
                            {errors.emergencyName && <p className="mt-1 text-xs text-red-500">{errors.emergencyName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                            <input
                                type="text"
                                name="emergencyPhone"
                                value={formData.emergencyPhone}
                                onChange={handleChange}
                                placeholder="+91XXXXXXXXXX"
                                className={`mt-1 block w-full rounded-md border ${errors.emergencyPhone ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                            />
                            {errors.emergencyPhone && <p className="mt-1 text-xs text-red-500">{errors.emergencyPhone}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Relationship *</label>
                            <input
                                type="text"
                                name="emergencyRelation"
                                value={formData.emergencyRelation}
                                onChange={handleChange}
                                placeholder="e.g. Spouse, Son, Daughter"
                                className={`mt-1 block w-full rounded-md border ${errors.emergencyRelation ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                            />
                            {errors.emergencyRelation && <p className="mt-1 text-xs text-red-500">{errors.emergencyRelation}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                            <input
                                type="email"
                                name="emergencyEmail"
                                value={formData.emergencyEmail}
                                onChange={handleChange}
                                placeholder="emergency@example.com"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                        </div>
                        <div className="flex space-x-4 mt-6">
                            <button
                                onClick={prevStep}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving...' : '✅ Complete Profile'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileSetup;