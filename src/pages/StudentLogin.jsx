import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { GraduationCap, Lock, CheckCircle, AlertCircle, BookOpen, UserPlus, ArrowRight, User, MapPin, Calendar, Mail, Phone, Info, Loader2, X, Check } from 'lucide-react';

export default function StudentLogin() {
    const navigate = useNavigate();
    const { loginStudent, loading: authLoading } = useAuth();

    // Modal State
    const [showActivateModal, setShowActivateModal] = useState(false);

    // Login State
    const [loginId, setLoginId] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Activation Form State
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [courses, setCourses] = useState([]);
    const [generatedCredentials, setGeneratedCredentials] = useState(null);

    // COMPREHENSIVE FORM DATA
    const [formData, setFormData] = useState({
        // Enrollment Keys
        studentId: '', course: '',

        // Personal Info
        firstName: '', lastName: '', middleName: '', suffix: '',
        dob: '', age: '', placeOfBirth: '',
        nationality: 'Filipino',
        sex: '', genderIdentity: '',
        civilStatus: '',

        // Contact
        street: '', city: '', province: '', zipCode: '',
        mobile: '', email: '', facebookUrl: '',

        // Background
        schoolLastAttended: '', yearLevelApplying: '1st Year',
        isWorkingStudent: 'No', workingStudentType: '',
        supporter: [], supporterContact: '',
        isPwd: 'No', pwdType: '',
        isIndigenous: 'No', indigenousGroup: '',
        witnessedConflict: 'No', isSoloParent: 'No', isChildOfSoloParent: 'No',

        // Agreements
        agreedToPrivacy: false
    });

    useEffect(() => {
        if (showActivateModal) {
            const fetchCourses = async () => {
                const { data } = await supabase.from('courses').select('name').order('name');
                if (data) setCourses(data);
            };
            fetchCourses();
        }
    }, [showActivateModal]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'dob') {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            setFormData(prev => ({ ...prev, [name]: value, age: age >= 0 ? age : '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCheckboxGroup = (e, field) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const current = prev[field] || [];
            if (checked) return { ...prev, [field]: [...current, value] };
            return { ...prev, [field]: current.filter(item => item !== value) };
        });
    };

    // Handle Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const result = await loginStudent(loginId, loginPassword);

        if (result.success) {
            showToast("Login Successful", 'success');
            setTimeout(() => navigate('/student'), 1000);
        } else {
            showToast(result.error, 'error');
        }
        setLoading(false);
    };

    // Handle Activation
    const handleActivation = async (e) => {
        e.preventDefault();

        if (!formData.agreedToPrivacy) {
            showToast("You must agree to the Data Privacy Disclaimer.", 'error');
            return;
        }

        setLoading(true);
        try {
            // 1. Verify Enrollment Key
            const { data: keyData, error: keyError } = await supabase
                .from('enrolled_students')
                .select('*')
                .eq('student_id', formData.studentId)
                .maybeSingle();

            if (keyError) throw new Error("Verification failed. Please check connection.");

            if (!keyData) {
                throw new Error("Student ID not found in the enrollment list.");
            }
            if (keyData.course && keyData.course.toLowerCase() !== formData.course.toLowerCase()) {
                throw new Error(`Course mismatch. This ID is enrolled in ${keyData.course}.`);
            }
            if (keyData.is_used) {
                throw new Error("This Student ID has already been activated.");
            }

            // 2. Generate Credentials
            const username = formData.studentId;
            const password = Math.random().toString(36).slice(-8).toUpperCase();

            // 3. Payload
            const getDepartment = (c) => {
                const lower = c?.toLowerCase() || '';
                if (lower.includes('agriculture')) return 'College of Agriculture and Forestry';
                if (lower.includes('criminology')) return 'College of Criminal Justice Education';
                if (lower.includes('information')) return 'College of Information Technology';
                if (lower.includes('midwifery') || lower.includes('arts')) return 'College of Arts and Sciences';
                if (lower.includes('engineering')) return 'College of Engineering';
                if (lower.includes('education')) return 'College of Education';
                if (lower.includes('nursing')) return 'College of Nursing';
                if (lower.includes('accountancy') || lower.includes('business')) return 'College of Business';
                return 'College of Arts and Sciences';
            };

            const studentPayload = {
                student_id: formData.studentId,
                first_name: formData.firstName,
                last_name: formData.lastName,
                middle_name: formData.middleName,
                suffix: formData.suffix,
                dob: formData.dob,
                age: formData.age,
                place_of_birth: formData.placeOfBirth,
                password: password,
                course: formData.course,
                year_level: formData.yearLevelApplying,
                sex: formData.sex,
                gender: formData.sex, // Map sex to gender column
                gender_identity: formData.genderIdentity,
                civil_status: formData.civilStatus,
                nationality: formData.nationality,
                email: formData.email,
                mobile: formData.mobile,
                facebook_url: formData.facebookUrl,
                address: `${formData.street}, ${formData.city}, ${formData.province}`,
                emergency_contact: formData.supporterContact, // Map supporterContact to emergency_contact
                street: formData.street,
                city: formData.city,
                province: formData.province,
                zip_code: formData.zipCode,
                school_last_attended: formData.schoolLastAttended,
                is_working_student: formData.isWorkingStudent === 'Yes',
                working_student_type: formData.workingStudentType,
                supporter: formData.supporter.join(', '),
                supporter_contact: formData.supporterContact,
                is_pwd: formData.isPwd === 'Yes',
                pwd_type: formData.pwdType,
                is_indigenous: formData.isIndigenous === 'Yes',
                indigenous_group: formData.indigenousGroup,
                witnessed_conflict: formData.witnessedConflict === 'Yes',
                is_solo_parent: formData.isSoloParent === 'Yes',
                is_child_of_solo_parent: formData.isChildOfSoloParent === 'Yes',
                department: getDepartment(formData.course),
                status: 'Active'
            };

            const { error: insertError } = await supabase.from('students').insert([studentPayload]);
            if (insertError) {
                if (insertError.code === '23505') throw new Error("Account already exists.");
                throw insertError;
            }

            await supabase.from('enrolled_students')
                .update({ is_used: true, assigned_to_email: formData.email })
                .eq('student_id', formData.studentId);

            // Mock Email
            try {
                await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'STUDENT_ACTIVATION',
                        email: formData.email,
                        name: `${formData.firstName} ${formData.lastName}`,
                        studentId: username,
                        password: password
                    }
                });
            } catch (err) { console.error("Email failed", err); }

            setGeneratedCredentials({ username, password });
            showToast("Account Activated Successfully!", 'success');

        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 relative overflow-hidden font-inter">
            {/* Background Animations */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-sky-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

            {/* Left: Branding */}
            <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
                <div className="relative z-10 text-white max-w-lg animate-fade-in-up">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-sky-300 rounded-3xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-blue-500/30 animate-float">
                        <GraduationCap size={48} />
                    </div>
                    <h2 className="text-6xl font-black mb-6 leading-tight tracking-tight">Student<br />Portal</h2>
                    <p className="text-blue-100/80 text-xl leading-relaxed font-light">
                        Access your academic profile, scholarships, and campus services in one secure place.
                    </p>
                </div>
            </div>

            {/* Right: Login Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 md:p-8 relative z-10">
                <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-8">

                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-1">Welcome Back</h1>
                                <p className="text-blue-200/70 text-sm">Sign in to continue</p>
                            </div>
                            <button
                                onClick={() => { setShowActivateModal(true); setGeneratedCredentials(null); }}
                                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1.5 hover:scale-105 active:scale-95"
                            >
                                <UserPlus size={14} /> Activate Account
                            </button>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-blue-100/80 mb-1.5 uppercase tracking-wider">Student ID</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-300/50 group-focus-within:text-blue-200"><User size={18} /></div>
                                    <input required className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/30 focus:bg-white/10 focus:border-blue-300/50 transition-all outline-none backdrop-blur-sm" placeholder="e.g. 2023-12345" value={loginId} onChange={e => setLoginId(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-100/80 mb-1.5 uppercase tracking-wider">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-300/50 group-focus-within:text-blue-200"><Lock size={18} /></div>
                                    <input required type="password" className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/30 focus:bg-white/10 focus:border-blue-300/50 transition-all outline-none backdrop-blur-sm" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                                </div>
                            </div>
                            <button disabled={loading || authLoading} type="submit" className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-4 rounded-xl font-bold hover:from-blue-400 hover:to-sky-300 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                                {loading ? 'Verifying...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* --- ACTIVATION MODAL --- */}
            {showActivateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in relative">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><UserPlus className="text-blue-600" /> Activate Student Account</h2>
                                <p className="text-sm text-gray-500">Provide complete details to register your student profile.</p>
                            </div>
                            <button onClick={() => setShowActivateModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24} className="text-gray-500" /></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-grow overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
                            {generatedCredentials ? (
                                <div className="text-center py-12">
                                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-12 h-12 text-green-600" /></div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-2">Activation Successful!</h3>
                                    <p className="text-gray-600 mb-8 max-w-md mx-auto">Your account has been created.</p>

                                    <div className="max-w-md mx-auto bg-blue-50 border border-blue-100 rounded-2xl p-8 mb-8">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm text-left">
                                                <p className="text-xs text-blue-500 font-bold uppercase mb-1">Student ID</p>
                                                <p className="font-mono font-bold text-xl text-gray-900 tracking-wider">{generatedCredentials.username}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm text-left">
                                                <p className="text-xs text-blue-500 font-bold uppercase mb-1">Password</p>
                                                <p className="font-mono font-bold text-xl text-gray-900 tracking-wider">{generatedCredentials.password}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setShowActivateModal(false); setLoginId(generatedCredentials.username); }}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:-translate-y-0.5"
                                    >
                                        Go to Login
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleActivation} className="space-y-8">
                                    {/* Section: Enrollment Verification */}
                                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-green-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><BookOpen className="w-5 h-5" /></div>
                                            Enrollment Verification
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Student ID <span className="text-red-500">*</span></label>
                                                <input required name="studentId" className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all hover:bg-white" placeholder="e.g. 2023-12345" value={formData.studentId} onChange={handleChange} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Course <span className="text-red-500">*</span></label>
                                                <select required name="course" className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all hover:bg-white" value={formData.course} onChange={handleChange}>
                                                    <option value="">Select Course</option>
                                                    {courses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section: Personal */}
                                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><User className="w-5 h-5" /></div>
                                            Personal Information
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            <div className="col-span-2 md:col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">First Name *</label><input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" /></div>
                                            <div className="col-span-2 md:col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Last Name *</label><input required name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" /></div>
                                            <div className="col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Middle Name</label><input name="middleName" value={formData.middleName} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" /></div>
                                            <div className="col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Suffix</label><input name="suffix" value={formData.suffix} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                            <div className="col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Date of Birth *</label><input required type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" /></div>
                                            <div className="col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Age *</label><input required type="number" name="age" value={formData.age} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" /></div>
                                            <div className="col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Place of Birth *</label><input required name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Nationality *</label><input required name="nationality" value={formData.nationality} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" /></div>
                                            <div className="col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Sex *</label><select required name="sex" value={formData.sex} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                            <div className="col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Civil Status *</label><select required name="civilStatus" value={formData.civilStatus} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white">
                                                <option value="">Select</option>
                                                <option value="Single">Single</option>
                                                <option value="Married">Married</option>
                                                <option value="Separated (Legally)">Separated (Legally)</option>
                                                <option value="Separated (Physically)">Separated (Physically)</option>
                                                <option value="With Live-In Partner">With Live-In Partner</option>
                                                <option value="Divorced">Divorced</option>
                                                <option value="Widow/er">Widow/er</option>
                                            </select></div>
                                            <div className="col-span-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Gender ID</label><select name="genderIdentity" value={formData.genderIdentity} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white"><option value="">Optional</option><option value="Cis-gender">Cis-gender</option><option value="Transgender">Transgender</option><option value="Non-binary">Non-binary</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                                        </div>
                                    </div>

                                    {/* Section: Contact */}
                                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-teal-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-teal-900/10 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                            <div className="bg-teal-100 p-2 rounded-lg text-teal-600"><MapPin className="w-5 h-5" /></div>
                                            Contact Information
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Complete Address *</label><input required name="street" placeholder="Street / Block / Lot" value={formData.street} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" /></div>
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">City *</label><input required name="city" placeholder="City" value={formData.city} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" /></div>
                                                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Province *</label><input required name="province" placeholder="Province" value={formData.province} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" /></div>
                                                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Zip Code *</label><input required name="zipCode" placeholder="Zip Code" value={formData.zipCode} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" /></div>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Email *</label><input required name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" /></div>
                                                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Mobile *</label><input required name="mobile" placeholder="Mobile Number" value={formData.mobile} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" /></div>
                                            </div>
                                            <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Facebook URL (Optional)</label><input name="facebookUrl" placeholder="https://facebook.com/username" value={formData.facebookUrl} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" /></div>
                                        </div>
                                    </div>

                                    {/* Section: Education */}
                                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-indigo-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-900/10 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><GraduationCap className="w-5 h-5" /></div>
                                            Education
                                        </h3>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">School Last Attended *</label><input required name="schoolLastAttended" placeholder="Name of School" value={formData.schoolLastAttended} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all hover:bg-white" /></div>
                                            <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Year Level Application *</label><select required name="yearLevelApplying" value={formData.yearLevelApplying} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all hover:bg-white">
                                                <option value="1st Year">1st Year</option>
                                                <option value="2nd Year">2nd Year</option>
                                                <option value="3rd Year">3rd Year</option>
                                                <option value="4th Year">4th Year</option>
                                                <option value="Transferee">Transferee</option>
                                            </select></div>
                                        </div>
                                    </div>

                                    {/* Section: Socio-Economic */}
                                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-violet-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-violet-900/10 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500"></div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                            <div className="bg-violet-100 p-2 rounded-lg text-violet-600"><Info className="w-5 h-5" /></div>
                                            Socio-Economic Information
                                        </h3>

                                        {/* Working Student */}
                                        <div className="mb-6">
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Are you a Working Student?</label>
                                            <div className="flex gap-4 mb-3">
                                                {['Yes', 'No'].map(opt => (
                                                    <label key={opt} className="flex items-center gap-2 cursor-pointer bg-white/50 px-3 py-2 rounded-lg border border-transparent hover:border-violet-200 transition-all"><input type="radio" name="isWorkingStudent" value={opt} checked={formData.isWorkingStudent === opt} onChange={handleChange} className="text-violet-600" /> <span className="text-sm font-medium text-gray-700">{opt}</span></label>
                                                ))}
                                            </div>
                                            {formData.isWorkingStudent === 'Yes' && (
                                                <div className="pl-4 border-l-2 border-violet-200 ml-1 animate-in slide-in-from-top-2 duration-200">
                                                    <label className="text-xs font-bold text-violet-700 mb-2 block">Select Type:</label>
                                                    <select name="workingStudentType" value={formData.workingStudentType} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all hover:bg-white">
                                                        <option value="">Select Work Type</option>
                                                        <option value="House help">House help</option>
                                                        <option value="Call Center Agent / BPO">Call Center Agent / BPO</option>
                                                        <option value="Fast Food / Restaurant">Fast Food / Restaurant</option>
                                                        <option value="Online Employee / Freelancer">Online Employee / Freelancer</option>
                                                        <option value="Self-employed">Self-employed</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {/* Supporter */}
                                        <div className="mb-6">
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2 tracking-wider ml-1">Person Who Supports Your Studies Aside from Your Parents:</label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                                {['Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Partner', 'Scholarship Grants', 'Other'].map(s => (
                                                    <label key={s} className="flex items-center gap-2 cursor-pointer text-sm p-2 hover:bg-violet-50 rounded-lg transition-colors border border-transparent hover:border-violet-100">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.supporter.includes(s)}
                                                            value={s}
                                                            onChange={e => handleCheckboxGroup(e, 'supporter')}
                                                            className="text-violet-600 rounded w-4 h-4 border-gray-300 focus:ring-violet-500"
                                                        />
                                                        <span className="text-gray-700 font-medium">{s}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="space-y-1.5 ml-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Information of Supporter</label>
                                                <input name="supporterContact" placeholder="Phone or Email" value={formData.supporterContact} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all hover:bg-white" />
                                            </div>
                                        </div>

                                        {/* PWD & Indigenous */}
                                        <div className="space-y-8 mt-8">
                                            {/* PWD Section */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-3 tracking-wider ml-1">ARE YOU A PERSON WITH DISABILITY (PWD)?</label>
                                                <div className="flex gap-6 mb-4">
                                                    {['Yes', 'No'].map(opt => (
                                                        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.isPwd === opt ? 'border-green-600' : 'border-gray-300 group-hover:border-green-500'}`}>
                                                                {formData.isPwd === opt && <div className="w-2.5 h-2.5 bg-green-600 rounded-full" />}
                                                            </div>
                                                            <input type="radio" name="isPwd" value={opt} checked={formData.isPwd === opt} onChange={handleChange} className="hidden" />
                                                            <span className="text-sm font-bold text-gray-700">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>

                                                {formData.isPwd === 'Yes' && (
                                                    <div className="pl-6 border-l-4 border-violet-200 ml-2 py-2 animate-in slide-in-from-top-2 duration-300">
                                                        <p className="text-sm font-bold text-violet-700 mb-4">If YES, please specify:</p>
                                                        <div className="grid md:grid-cols-2 gap-y-3 gap-x-8">
                                                            {[
                                                                'Visual impairment', 'Hearing impairment',
                                                                'Physical / Orthopedic', 'Chronic illness',
                                                                'Psychosocial disability', 'Communication disability',
                                                                'Other'
                                                            ].map(type => (
                                                                <label key={type} className="flex items-center gap-3 cursor-pointer group hover:bg-violet-50/50 p-1 rounded transition-colors">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${formData.pwdType === type ? 'border-gray-500' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                                                        {formData.pwdType === type && <div className="w-2 h-2 bg-gray-600 rounded-full" />}
                                                                    </div>
                                                                    <input type="radio" name="pwdType" value={type} checked={formData.pwdType === type} onChange={handleChange} className="hidden" />
                                                                    <span className="text-sm text-gray-700">{type}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Indigenous Section */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-3 tracking-wider ml-1">ARE YOU A MEMBER OF AN INDIGENOUS GROUP?</label>
                                                <div className="flex gap-6 mb-4">
                                                    {['Yes', 'No'].map(opt => (
                                                        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.isIndigenous === opt ? 'border-green-600' : 'border-gray-300 group-hover:border-green-500'}`}>
                                                                {formData.isIndigenous === opt && <div className="w-2.5 h-2.5 bg-green-600 rounded-full" />}
                                                            </div>
                                                            <input type="radio" name="isIndigenous" value={opt} checked={formData.isIndigenous === opt} onChange={handleChange} className="hidden" />
                                                            <span className="text-sm font-bold text-gray-700">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>

                                                {formData.isIndigenous === 'Yes' && (
                                                    <div className="pl-6 border-l-4 border-violet-200 ml-2 py-2 animate-in slide-in-from-top-2 duration-300">
                                                        <p className="text-sm font-bold text-violet-700 mb-2">If YES, please specify:</p>
                                                        <input
                                                            name="indigenousGroup"
                                                            placeholder="e.g. Bukidnon, Lumad"
                                                            value={formData.indigenousGroup}
                                                            onChange={handleChange}
                                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all hover:bg-white text-sm"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section: Family & Community (Pink) */}
                                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-pink-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-pink-900/10 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-500"></div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                            <div className="bg-pink-100 p-2 rounded-lg text-pink-600"><UserPlus className="w-5 h-5" /></div>
                                            Family & Community
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { l: 'Witnessed armed conflict in community?', k: 'witnessedConflict' },
                                                { l: 'Are you a solo parent?', k: 'isSoloParent' },
                                                { l: 'Child of a solo parent?', k: 'isChildOfSoloParent' }
                                            ].map(item => (
                                                <div key={item.k} className="flex justify-between items-center p-4 bg-white/40 rounded-xl border border-transparent hover:border-pink-100 transition-all">
                                                    <span className="text-sm font-medium text-gray-700">{item.l}</span>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name={item.k} value="Yes" checked={formData[item.k] === 'Yes'} onChange={handleChange} className="text-pink-600" /> <span className="text-sm font-bold">Yes</span></label>
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name={item.k} value="No" checked={formData[item.k] === 'No'} onChange={handleChange} className="text-pink-600" /> <span className="text-sm font-bold">No</span></label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Privacy */}
                                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 backdrop-blur-sm">
                                        <h2 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> DATA PRIVACY ACT DISCLAIMER</h2>
                                        <p className="text-xs text-blue-800 mb-4 text-justify leading-relaxed opacity-80">By submitting this, I authorize NORSU to collect and process my data for university records in accordance with the Data Privacy Act.</p>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.agreedToPrivacy ? 'bg-blue-600 border-blue-600' : 'border-gray-400 group-hover:border-blue-500'}`}>
                                                {formData.agreedToPrivacy && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <input type="checkbox" checked={formData.agreedToPrivacy} onChange={e => setFormData({ ...formData, agreedToPrivacy: e.target.checked })} className="hidden" />
                                            <span className="text-sm font-bold text-blue-900">I agree to the terms and conditions</span>
                                        </label>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 pb-8">
                                        <button type="button" onClick={() => setShowActivateModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                                        <button disabled={loading} type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
                                            {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                            {loading ? 'Activating...' : 'Activate Account'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-right z-[60] ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    <div className="text-xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                    <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                </div>
            )}
        </div>
    );
}
