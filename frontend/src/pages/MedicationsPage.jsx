import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { medicationApi } from "../api/medicationApi";

const MedicationsPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [medications, setMedications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingMed, setEditingMed] = useState(null);
    const [filter, setFilter] = useState("all");

    const [formData, setFormData] = useState({
        name: "",
        dosage: "",
        frequency: "DAILY",
        scheduledTimes: [],
        startDate: "",
        endDate: "",
        instructions: "",
        sideEffects: "",
    });
    const [timeInput, setTimeInput] = useState("");

    useEffect(() => {
        fetchMedications();
    }, []);

    const fetchMedications = async () => {
        try {
            setLoading(true);
            const response = await medicationApi.getAllMedications();
            if (response.success) setMedications(response.data || []);
        } catch (err) {
            setError("Failed to load medications");
        } finally {
            setLoading(false);
        }
    };

    const handleAddTime = () => {
        if (timeInput && !formData.scheduledTimes.includes(timeInput)) {
            setFormData({
                ...formData,
                scheduledTimes: [...formData.scheduledTimes, timeInput].sort(),
            });
            setTimeInput("");
        }
    };

    const handleRemoveTime = (time) => {
        setFormData({
            ...formData,
            scheduledTimes: formData.scheduledTimes.filter((t) => t !== time),
        });
    };

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
    
        // ✅ Check scheduled times FIRST before anything else
        if (formData.scheduledTimes.length === 0) {
            setError('Please add at least one scheduled time using the + Add button');
            return;
        }
    
        try {
            const medicationData = {
                name: formData.name,
                dosage: formData.dosage,
                frequency: formData.frequency,
                scheduledTimes: formData.scheduledTimes,
                instructions: formData.instructions,
                sideEffects: formData.sideEffects,
                startDate: formData.startDate ? `${formData.startDate}T00:00:00` : null,
                endDate: formData.endDate ? `${formData.endDate}T23:59:59` : null,
            };
    
            let response;
            if (editingMed) {
                response = await medicationApi.updateMedication(editingMed.id, medicationData);
            } else {
                response = await medicationApi.createMedication(medicationData);
            }
    
            if (response.success) {
                setSuccess(editingMed ? 'Medication updated!' : 'Medication added!');
                await fetchMedications();
                setShowAddModal(false);
                setEditingMed(null);
                resetForm();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.message || 'Failed to save medication');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save medication. Please try again.');
        }
    };
    
    const handleEdit = (medication) => {
        setEditingMed(medication);
        setFormData({
            name: medication.name || "",
            dosage: medication.dosage || "",
            frequency: medication.frequency || "DAILY",
            scheduledTimes: medication.scheduledTimes || [],
            startDate: medication.startDate?.split("T")[0] || "",
            endDate: medication.endDate?.split("T")[0] || "",
            instructions: medication.instructions || "",
            sideEffects: medication.sideEffects || "",
        });
        setShowAddModal(true);
    };

    const handleDelete = async (medicationId) => {
        if (!window.confirm("Delete this medication?")) return;
        try {
            const response = await medicationApi.deleteMedication(medicationId);
            if (response.success) {
                setSuccess("Medication deleted!");
                await fetchMedications();
                setTimeout(() => setSuccess(""), 3000);
            }
        } catch {
            setError("Failed to delete");
            setTimeout(() => setError(""), 5000);
        }
    };

    const handleLogTaken = async (medicationId, medicationName) => {
        try {
            const response = await medicationApi.logMedicationTaken(medicationId, {});
            if (response.success) {
                setSuccess(`${medicationName} marked as taken ✅`);
                await fetchMedications();
                setTimeout(() => setSuccess(""), 3000);
            }
        } catch {
            setError("Failed to log");
            setTimeout(() => setError(""), 5000);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            dosage: "",
            frequency: "DAILY",
            scheduledTimes: [],
            startDate: "",
            endDate: "",
            instructions: "",
            sideEffects: "",
        });
        setTimeInput("");
    };

    const getNextDose = (medication) => {
        if (!medication.scheduledTimes?.length) return null;
        const currentTime = new Date().toTimeString().slice(0, 5);
        const upcoming = medication.scheduledTimes.filter((t) => t > currentTime);
        return upcoming.length > 0 ? upcoming[0] : medication.scheduledTimes[0];
    };

    const filteredMedications = medications.filter((m) => {
        if (filter === "active") return m.active !== false;
        if (filter === "inactive") return m.active === false;
        return true;
    });

    const activeMeds = medications.filter((m) => m.active !== false).length;
    const inactiveMeds = medications.filter((m) => m.active === false).length;

    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sticky Navbar */}
            <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-3">
                    <button
                        onClick={() => navigate("/home")}
                        className="text-gray-400 hover:text-gray-800 font-bold text-lg leading-none"
                    >
                        ←
                    </button>
                    <span className="font-bold text-gray-900 text-sm">
                        💊 Medications
                    </span>
                    <div className="flex-1" />
                    <span className="text-xs text-gray-400 hidden sm:block">
                        {user?.fullName}
                    </span>
                    <button
                        onClick={async () => {
                            await logout();
                            navigate("/login");
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-4 py-5">
                {/* Notifications */}
                {error && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        ⚠️ {error}
                    </div>
                )}
                {success && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        ✅ {success}
                    </div>
                )}

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                        { label: "Total", value: medications.length, color: "gray" },
                        { label: "Active", value: activeMeds, color: "green" },
                        { label: "Inactive", value: inactiveMeds, color: "red" },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm"
                        >
                            <p className={`text-2xl font-black text-${s.color}-600`}>
                                {s.value}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filter + Add */}
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex gap-1.5">
                        {["all", "active", "inactive"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === f
                                        ? "bg-blue-600 text-white"
                                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            setEditingMed(null);
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                        + Add Medication
                    </button>
                </div>

                {/* Empty state */}
                {filteredMedications.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                        <p className="text-5xl mb-3">💊</p>
                        <p className="font-medium">
                            No {filter !== "all" ? filter : ""} medications found
                        </p>
                        <button
                            onClick={() => {
                                setEditingMed(null);
                                resetForm();
                                setShowAddModal(true);
                            }}
                            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                        >
                            + Add your first medication
                        </button>
                    </div>
                )}

                {/* Medication Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMedications.map((med) => {
                        const nextDose = getNextDose(med);
                        return (
                            <div
                                key={med.id}
                                className={`bg-white border-2 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${med.active !== false ? "border-blue-100" : "border-gray-100"
                                    }`}
                            >
                                {/* Top color bar */}
                                <div
                                    className={`h-1 w-full ${med.active !== false ? "bg-blue-500" : "bg-gray-300"
                                        }`}
                                />

                                <div className="p-4">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 text-sm truncate">
                                                {med.name || "Unnamed Medicine"}
                                            </h3>
                                            {med.dosage && (
                                                <p className="text-xs text-blue-600 font-medium mt-0.5">
                                                    {med.dosage}
                                                </p>
                                            )}
                                        </div>
                                        <span
                                            className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${med.active !== false
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-gray-100 text-gray-500"
                                                }`}
                                        >
                                            {med.active !== false ? "Active" : "Inactive"}
                                        </span>
                                    </div>

                                    {/* Info rows */}
                                    <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 w-16 shrink-0">
                                                Frequency
                                            </span>
                                            <span className="font-medium">
                                                {med.frequency?.replace(/_/g, " ")}
                                            </span>
                                        </div>
                                        {nextDose && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 w-16 shrink-0">
                                                    Next dose
                                                </span>
                                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                    {nextDose}
                                                </span>
                                            </div>
                                        )}
                                        {med.startDate && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 w-16 shrink-0">
                                                    Start
                                                </span>
                                                <span>
                                                    {new Date(med.startDate).toLocaleDateString("en-IN")}
                                                </span>
                                            </div>
                                        )}
                                        {med.endDate && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 w-16 shrink-0">End</span>
                                                <span className="text-red-600">
                                                    {new Date(med.endDate).toLocaleDateString("en-IN")}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Schedule chips */}
                                    {med.scheduledTimes?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {med.scheduledTimes.map((t, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium"
                                                >
                                                    🕐 {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Instructions */}
                                    {med.instructions && (
                                        <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1.5 mb-3 line-clamp-2">
                                            📋 {med.instructions}
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => handleLogTaken(med.id, med.name)}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                                        >
                                            ✓ Taken
                                        </button>
                                        <button
                                            onClick={() => handleEdit(med)}
                                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-1.5 rounded-lg transition-colors"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(med.id)}
                                            className="bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                            <h2 className="font-bold text-gray-900">
                                {editingMed ? "✏️ Edit Medication" : "+ Add Medication"}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditingMed(null);
                                    resetForm();
                                }}
                                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* ✅ Modal-level error — shows INSIDE modal */}
                        {error && (
                            <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                ⚠️ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Medication Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    placeholder="e.g. Paracetamol"
                                    required
                                />
                            </div>

                            {/* Dosage + Frequency */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Dosage *
                                    </label>
                                    <input
                                        type="text"
                                        name="dosage"
                                        value={formData.dosage}
                                        onChange={handleChange}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                        placeholder="e.g. 500mg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Frequency *
                                    </label>
                                    <select
                                        name="frequency"
                                        value={formData.frequency}
                                        onChange={handleChange}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    >
                                        <option value="DAILY">Daily</option>
                                        <option value="TWICE_DAILY">Twice Daily</option>
                                        <option value="WEEKLY">Weekly</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        End Date (optional)
                                    </label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                            </div>

                            {/* Scheduled Times */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Scheduled Times *
                                    {formData.scheduledTimes.length === 0 && (
                                        <span className="text-red-400 ml-1">
                                            (at least one required)
                                        </span>
                                    )}
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="time"
                                        value={timeInput}
                                        onChange={(e) => setTimeInput(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    />
                                    <button
                                        type="button" // ✅ Prevents form submit
                                        onClick={() => {
                                            if (!timeInput) {
                                                return;
                                            }
                                            if (formData.scheduledTimes.includes(timeInput)) {
                                                return;
                                            }
                                            setFormData((prev) => ({
                                                ...prev,
                                                scheduledTimes: [
                                                    ...prev.scheduledTimes,
                                                    timeInput,
                                                ].sort(),
                                            }));
                                            setTimeInput("");
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                                    >
                                        + Add
                                    </button>
                                </div>

                                {/* Time chips */}
                                {formData.scheduledTimes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 p-2 bg-blue-50 rounded-lg">
                                        {formData.scheduledTimes.map((t) => (
                                            <span
                                                key={t}
                                                className="flex items-center gap-1 text-xs bg-white text-blue-700 border border-blue-200 px-2 py-1 rounded-full shadow-sm"
                                            >
                                                🕐 {t}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            scheduledTimes: prev.scheduledTimes.filter(
                                                                (x) => x !== t
                                                            ),
                                                        }))
                                                    }
                                                    className="text-red-400 hover:text-red-600 font-bold ml-0.5"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-400">
                                        No times added yet — pick a time and click + Add
                                    </div>
                                )}
                            </div>

                            {/* Instructions */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Instructions
                                </label>
                                <textarea
                                    name="instructions"
                                    value={formData.instructions}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                                    placeholder="e.g. Take after meals"
                                />
                            </div>

                            {/* Side Effects */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Side Effects (optional)
                                </label>
                                <textarea
                                    name="sideEffects"
                                    value={formData.sideEffects}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                                    placeholder="e.g. Drowsiness, nausea"
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                                >
                                    {editingMed ? "Update Medication" : "Add Medication"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingMed(null);
                                        resetForm();
                                        setError("");
                                    }}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicationsPage;
