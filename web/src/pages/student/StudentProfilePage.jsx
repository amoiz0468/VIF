import React from 'react';
import {
  User as UserIcon,
  Edit3,
  Mail,
  GraduationCap,
  Award,
  Phone,
  Heart,
  MapPin,
  Navigation,
  Save,
  CheckCircle2,
  Upload,
  ShieldCheck,
} from 'lucide-react';

export default function StudentProfilePage({
  user,
  studentAddress,
  historyData,
  profileForm,
  setProfileForm,
  savingProfile,
  onSaveProfile,
  onApplyDefaultAddressToMap,
  uploadingId,
  onIdUpload,
  onNavigatePage,
}) {
  return (
    <div className="student-page-wrapper">
      <div className="portal-grid" style={{ marginBottom: '28px' }}>
        <div className="portal-main-column">
          <div className="glass-panel" style={{ padding: '26px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div className="badge badge-indigo" style={{ marginBottom: '6px' }}>
                <Edit3 size={13} /> Dedicated Student Profile Page
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Edit Your Student Profile &amp; Preferences
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
                Keep your academic details, contact information, default Paris address, and dietary needs up to date in the PostgreSQL database.
              </p>
            </div>

            <form
              onSubmit={onSaveProfile}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                }}
              >
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UserIcon size={14} color="#D97706" /> Full Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Muhammad Abdul MOIZ"
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, full_name: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Mail size={14} color="#D97706" /> University Email (.edu, .eu, .ac.uk, .univ)
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="student@epitech.eu"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <GraduationCap size={14} color="#D97706" /> University / School
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. EPITECH Paris"
                    value={profileForm.university}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, university: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Award size={14} color="#D97706" /> Academic Program / Year
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Master 1 / Promo 2026"
                    value={profileForm.study_level}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, study_level: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Phone size={14} color="#D97706" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +33 6 12 34 56 78"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Heart size={14} color="#D97706" /> Dietary Preferences &amp; Allergies
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Vegetarian, Halal, No peanuts"
                    value={profileForm.dietary_preferences}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, dietary_preferences: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MapPin size={14} color="#D97706" /> Default Paris Street Address (for Surplus Radar)
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: '1', minWidth: '240px' }}
                    placeholder="e.g. 40 Rue du Docteur Roux, 75015 Paris"
                    value={profileForm.default_address}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, default_address: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onApplyDefaultAddressToMap}
                  >
                    <Navigation size={14} /> Apply &amp; Open Map Page
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Student Bio / Notes for Bakeries</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Short note about yourself, campus schedule, or favorite bakery items..."
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bio: e.target.value })
                  }
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div
                className="form-group"
                style={{ paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}
              >
                <label className="form-label">Change Account Password (Optional)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Leave blank to keep current password (min. 6 characters)"
                  value={profileForm.new_password}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, new_password: e.target.value })
                  }
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onNavigatePage('/student/history')}
                >
                  Open Student History Page
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProfile}
                >
                  <Save size={16} />
                  {savingProfile ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column in Profile Page: Live Student Card Preview & Quick Verification Link */}
        <div className="portal-side-column">
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                }}
              >
                {(profileForm.full_name || user?.email || 'S')[0].toUpperCase()}
              </div>
              <div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#0F172A',
                  }}
                >
                  {profileForm.full_name || 'Student Profile'}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  {profileForm.university || 'University Student'}{' '}
                  {profileForm.study_level ? `· ${profileForm.study_level}` : ''}
                </p>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.83rem',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                marginBottom: '16px',
              }}
            >
              <div>
                <strong>Email:</strong> {profileForm.email || user?.email}
              </div>
              <div>
                <strong>Phone:</strong> {profileForm.phone || 'Not set'}
              </div>
              <div>
                <strong>Address:</strong> {profileForm.default_address || studentAddress}
              </div>
              <div>
                <strong>Dietary:</strong> {profileForm.dietary_preferences || 'Standard'}
              </div>
              <div>
                <strong>Card Validity:</strong>{' '}
                {historyData?.student_card_start_date || user?.student_card_start_date
                  ? `${historyData?.student_card_start_date || user?.student_card_start_date} to ${historyData?.student_card_end_date || user?.student_card_end_date}`
                  : 'Upload student ID on Verification Page'}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                  Student ID Card OCR
                </span>
                {user?.is_verified ? (
                  <span className="badge badge-emerald">
                    <CheckCircle2 size={12} /> Verified
                  </span>
                ) : (
                  <span className="badge badge-amber">Pending</span>
                )}
              </div>

              <label className="upload-dropzone" style={{ padding: '16px', marginBottom: '10px' }}>
                <Upload size={20} color="#F59E0B" />
                <span className="dropzone-text" style={{ fontSize: '0.84rem' }}>
                  {uploadingId ? 'Scanning Card with OCR...' : 'Quick Upload Student ID Card'}
                </span>
                <span className="dropzone-hint">Auto-extracts academic year &amp; validity</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onIdUpload}
                  disabled={uploadingId}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ width: '100%' }}
                onClick={() => onNavigatePage('/student/verification')}
              >
                <ShieldCheck size={14} /> Open Full Verification Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
