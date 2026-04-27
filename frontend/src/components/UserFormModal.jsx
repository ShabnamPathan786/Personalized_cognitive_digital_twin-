import { useState } from 'react';
import { storeUser } from '../api/saveUserData';
import { toast } from 'sonner';

export default function UserFormModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  
  const [errors, setErrors] = useState({});

  const { mutate, isPending } = storeUser();

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = 'Name is required';

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Invalid email';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\d{10}$/.test(form.phone)) {
      newErrors.phone = 'Enter valid 10-digit number';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    mutate(form, {
      onSuccess: (tx) => {
        if (tx) {
          toast.success('User data secured successfully!');
          onSave?.();
        }
      },
      onError: (e) => {
        console.log('ERROR:', e);
        setErrors({ general: e.message });
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(44, 44, 42, 0.35)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: 420,
          padding: 'var(--space-8)',
          border: '1px solid rgba(157, 189, 184, 0.2)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            marginBottom: 'var(--space-6)',
            color: 'var(--color-charcoal)',
          }}
        >
          Enter Your Details
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                type="text"
                placeholder="Full Name"
                className="input-field"
                style={{
                  background: 'var(--color-cream)',
                  border: '1px solid var(--color-cream-dark)',
                }}
              />
              {errors.name && (
                <p style={{ color: 'var(--color-ember)', fontSize: 12, marginTop: 4 }}>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                placeholder="Email Address"
                className="input-field"
                style={{
                  background: 'var(--color-cream)',
                  border: '1px solid var(--color-cream-dark)',
                }}
              />
              {errors.email && (
                <p style={{ color: 'var(--color-ember)', fontSize: 12, marginTop: 4 }}>
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                type="tel"
                placeholder="Phone Number"
                className="input-field"
                style={{
                  background: 'var(--color-cream)',
                  border: '1px solid var(--color-cream-dark)',
                }}
              />
              {errors.phone && (
                <p style={{ color: 'var(--color-ember)', fontSize: 12, marginTop: 4 }}>
                  {errors.phone}
                </p>
              )}
            </div>

            {errors.general && (
              <p style={{ color: 'var(--color-ember)', fontSize: 13, textAlign: 'center' }}>
                {errors.general}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-8)',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={isPending}
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}