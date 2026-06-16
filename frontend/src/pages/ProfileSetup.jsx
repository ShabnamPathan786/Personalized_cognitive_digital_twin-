import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserFormModal from '../components/UserFormModal';

const ProfileSetup = () => {
    const navigate = useNavigate();
    const { updateProfile, user } = useAuth();
    const [step, setStep] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        phoneNumber: user?.phoneNumber || '',
        address: user?.address || '',
        caregiverId: user?.caregiverIds?.[0] || '',
        diseaseStage: user?.preferences?.diseaseStage || 'EARLY',
        bloodGroup: user?.preferences?.bloodGroup || '',
        allergies: user?.preferences?.allergies || '',
        emergencyName: user?.emergencyContacts?.[0]?.name || '',
        emergencyPhone: user?.emergencyContacts?.[0]?.phoneNumber || '',
        emergencyEmail: user?.emergencyContacts?.[0]?.email || '',
        emergencyRelation: user?.emergencyContacts?.[0]?.relationship || ''
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: user.fullName || prev.fullName,
                phoneNumber: user.phoneNumber || prev.phoneNumber,
                address: user.address || prev.address,
                caregiverId: user.caregiverIds?.[0] || prev.caregiverId,
                diseaseStage: user.preferences?.diseaseStage || prev.diseaseStage,
                bloodGroup: user.preferences?.bloodGroup || prev.bloodGroup,
                allergies: user.preferences?.allergies || prev.allergies,
                emergencyName: user.emergencyContacts?.[0]?.name || prev.emergencyName,
                emergencyPhone: user.emergencyContacts?.[0]?.phoneNumber || prev.emergencyPhone,
                emergencyEmail: user.emergencyContacts?.[0]?.email || prev.emergencyEmail,
                emergencyRelation: user.emergencyContacts?.[0]?.relationship || prev.emergencyRelation
            }));
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
        else if (!/^\+?[0-9]{10,13}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
            newErrors.phoneNumber = 'Enter valid phone number (10-13 digits)';
        }
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        
        if (!formData.emergencyName.trim()) newErrors.emergencyName = 'Contact name is required';
        if (!formData.emergencyPhone.trim()) newErrors.emergencyPhone = 'Contact phone is required';
        else if (!/^\+?[0-9]{10,13}$/.test(formData.emergencyPhone.replace(/\s/g, ''))) {
            newErrors.emergencyPhone = 'Enter valid phone number (10-13 digits)';
        }
        if (!formData.emergencyRelation.trim()) newErrors.emergencyRelation = 'Relationship is required';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!validateForm()) {
            // Scroll to the top if there are errors
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setLoading(true);
        setErrors({});

        // Map frontend state to Backend Model (User.java)
        const profileData = {
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            caregiverId: formData.caregiverId || null,
            preferences: {
                diseaseStage: formData.diseaseStage,
                bloodGroup: formData.bloodGroup,
                allergies: formData.allergies
            },
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
                setStep(2); // Move to success step
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setErrors({ submit: result?.message || 'Failed to update profile' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            console.error('Profile submission error:', err);
            setErrors({ submit: 'An error occurred. Please try again.' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Health & Safety Profile</h2>
                    <p className="mt-2 text-gray-600">
                        {step === 1 ? 'Quickly set up your profile for safety and reminders.' : 'Profile Completed'}
                    </p>
                </div>

                {errors.submit && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                        {errors.submit}
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-8">
                        {/* Section 1: Personal Information */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">1. Personal Information</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows="2"
                                    className={`mt-1 block w-full rounded-md border ${errors.address ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                ></textarea>
                                {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
                            </div>
                        </div>

                        {/* Section 2: Medical Information */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">2. Medical Details</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        </div>

                        {/* Section 3: Caregiver & Emergency Contact */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">3. Caregiver & Emergency Contact</h3>
                            <p className="text-sm text-gray-500">This contact will receive SOS alerts and routine reminders.</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Caregiver ID (Optional)</label>
                                <input
                                    type="text"
                                    name="caregiverId"
                                    value={formData.caregiverId}
                                    onChange={handleChange}
                                    placeholder="Enter caregiver ID if applicable"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Caregiver Name *</label>
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
                                    <label className="block text-sm font-medium text-gray-700">Caregiver Phone *</label>
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
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            </div>
                        </div>

                        <div className="flex space-x-4 mt-8 pt-4 border-t">
                            <button
                                onClick={() => navigate('/home')}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                disabled={loading}
                            >
                                Skip for now
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-sm"
                            >
                                {loading ? 'Saving...' : 'Complete Setup'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="text-center space-y-6 py-6 animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-sm">
                            ✓
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">Profile Saved!</h3>
                        <p className="text-gray-600">Your health and safety profile has been successfully updated.</p>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mt-6 text-left shadow-sm">
                            <h4 className="font-bold text-blue-900 mb-2 flex items-center">
                                <span className="mr-2">🔐</span> Optional: Secure on Chain
                            </h4>
                            <p className="text-sm text-blue-800 mb-4 leading-relaxed">
                                You can permanently secure your identity on the blockchain for immutable access. This requires a digital wallet.
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                            >
                                Secure my private data on chain
                            </button>
                        </div>

                        <button
                            onClick={() => navigate('/home')}
                            className="w-full py-3 text-gray-500 hover:text-gray-900 font-medium mt-4 border border-transparent hover:border-gray-200 rounded-lg transition-colors"
                        >
                            Skip & go to Dashboard →
                        </button>
                    </div>
                )}
            </div>

            <UserFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={() => {
                    setIsModalOpen(false);
                    navigate('/home');
                }}
                prefillData={formData}
            />
        </div>
    );
};

export default ProfileSetup;
