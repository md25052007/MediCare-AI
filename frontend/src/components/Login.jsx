import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { jwtDecode } from 'jwt-decode';
import { User, Shield, ArrowLeft, Activity, Fingerprint, Sparkles, ChevronRight, Stethoscope } from 'lucide-react';

export default function Login() {
    const [loginType, setLoginType] = useState(null); // 'patient' | 'doctor'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const data = await authAPI.login(username, password);
            localStorage.setItem('token', data.access_token);
            
            // Decode token to see if user is a Doctor or Patient
            const decoded = jwtDecode(data.access_token);
            const role = decoded.role;

            if (role === 'doctor') {
                navigate('/doctor-dashboard');
            } else {
                navigate('/patient-dashboard');
            }
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#e0e5ec] pt-16 -mt-16 p-4 md:p-8 font-sans">
            {/* Colorful Vibrant Blobs */}
            <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-pink-500/40 mix-blend-multiply blur-[140px] animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[0%] w-[50vw] h-[50vw] rounded-full bg-amber-400/50 mix-blend-multiply blur-[140px] animate-pulse pointer-events-none" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
            <div className="absolute top-[30%] left-[30%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/40 mix-blend-multiply blur-[130px] animate-pulse pointer-events-none" style={{ animationDelay: '2s', animationDuration: '4s' }}></div>
            <div className="absolute bottom-[-20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-emerald-400/40 mix-blend-multiply blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '3s', animationDuration: '6s' }}></div>

            {/* 3D Main Container */}
            <div className="max-w-6xl w-full flex flex-col md:flex-row bg-white rounded-[3rem] border-4 border-white shadow-[0_30px_60px_rgba(0,0,0,0.15),0_15px_15px_rgba(0,0,0,0.1),inset_0_-10px_0_rgba(200,210,225,0.5)] overflow-hidden min-h-[620px] relative z-10 transform-gpu transition-all">
                
                {/* Left Branding Side (Graphic & 3D) */}
                <div className="md:w-[45%] relative p-10 md:p-14 flex flex-col justify-between overflow-hidden bg-[#3b82f6]">
                    {/* Deep Vibrant Gradient Base */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500 opacity-90"></div>
                    
                    {/* Abstract Overlays -> Pop out 3D shapes */}
                    <div className="absolute top-10 right-10 w-40 h-40 bg-yellow-400 rounded-full blur-[2px] shadow-[4px_10px_0_rgba(180,83,9,1)] transform rotate-12 flex items-center justify-center -mr-20 -mt-10 overflow-hidden">
                       <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
                    </div>
                    <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-cyan-400 rounded-3xl blur-[1px] shadow-[8px_15px_0_rgba(6,182,212,1)] transform rotate-45 flex items-center justify-center opacity-80">
                        <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/shattered-island.png')] opacity-30"></div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 mt-10">
                        <div className="flex items-center gap-2 text-white mb-10 bg-white/20 w-fit px-6 py-3 rounded-2xl border-b-4 border-white/30 backdrop-blur-md shadow-[0_8px_0_rgba(0,0,0,0.1)] transform rotate-[-2deg]">
                            <Activity size={24} strokeWidth={3} className="text-yellow-300" />
                            <span className="text-base font-black tracking-widest uppercase text-white drop-shadow-md">Medicare AI</span>
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black leading-[1.05] tracking-tighter text-white drop-shadow-[0_8px_0_rgba(0,0,0,0.15)] mb-8 transform -rotate-2">
                            Your Health,  <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400 drop-shadow-[0_4px_0_rgba(180,83,9,1)] flex items-center gap-4 mt-2">
                                Our Priority <Sparkles size={40} className="text-yellow-200 drop-shadow-[0_4px_0_rgba(180,83,9,1)]" fill="currentColor" />
                            </span>
                        </h2>
                        <p className="text-white text-xl leading-relaxed font-bold max-w-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] bg-black/10 p-5 rounded-2xl border-b-4 border-black/20 transform rotate-1">
                            Experience the clinical portal powered by next-generation vibrant AI.
                        </p>
                    </div>
                    
                    <div className="relative z-10 mt-14 bg-white/90 p-4 rounded-xl border-b-4 border-slate-300 w-fit rotate-[-1deg] shadow-lg">
                        <p className="text-[12px] font-black tracking-widest text-slate-800 uppercase flex items-center gap-2">
                            <Shield size={16} strokeWidth={3} className="text-emerald-500" /> 
                        </p>
                    </div>
                </div>

                {/* Right Interactive Side */}
                <div className="md:w-[55%] p-8 md:p-14 bg-[#f8fafc] flex items-center relative z-20">
                    
                    {/* Role Selection View */}
                    {!loginType ? (
                        <div className="w-full animate-in fade-in slide-in-from-right-8 duration-500 ease-out">
                            <div className="mb-12 text-center md:text-left">
                                <h3 className="text-4xl font-black text-slate-800 tracking-tighter flex items-center justify-center md:justify-start gap-3 drop-shadow-sm">
                                    Choose Portal
                                </h3>
                                <p className="text-slate-500 mt-3 font-bold text-lg">Select your vibrant identity to enter.</p>
                            </div>
                            
                            <div className="flex flex-col gap-8">
                                {/* 3D Patient Card */}
                                <button 
                                    onClick={() => setLoginType('patient')}
                                    className="group relative flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 p-6 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-3xl border-4 border-slate-900 shadow-[0_12px_0_theme(colors.slate.900)] hover:shadow-[0_4px_0_theme(colors.slate.900)] hover:translate-y-[8px] transition-all outline-none cursor-pointer"
                                >
                                    <div className="w-20 h-20 rounded-2xl bg-white border-4 border-slate-900 shadow-[inset_0_-6px_0_theme(colors.slate.200)] flex items-center justify-center flex-shrink-0 transform -rotate-3 group-hover:rotate-0 transition-transform">
                                        <User size={40} strokeWidth={3} className="text-blue-500" />
                                    </div>
                                    <div className="mt-2 md:mt-2 flex-1 relative pr-8">
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tight">Patient Portal</h4>
                                        <p className="text-base font-bold text-slate-800/80 mt-2 leading-relaxed">Access health records & AI Copilot in a whole new dimension.</p>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-white border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[0_6px_0_theme(colors.slate.900)] group-hover:shadow-[0_2px_0_theme(colors.slate.900)] group-hover:translate-y-[4px] transition-all">
                                           <ChevronRight size={24} strokeWidth={4} className="text-slate-900 ml-1" />
                                        </div>
                                    </div>
                                </button>

                                {/* 3D Doctor Card */}
                                <button 
                                    onClick={() => setLoginType('doctor')}
                                    className="group relative flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 p-6 bg-gradient-to-r from-fuchsia-400 to-purple-500 rounded-3xl border-4 border-slate-900 shadow-[0_12px_0_theme(colors.slate.900)] hover:shadow-[0_4px_0_theme(colors.slate.900)] hover:translate-y-[8px] transition-all outline-none cursor-pointer"
                                >
                                    <div className="w-20 h-20 rounded-2xl bg-white border-4 border-slate-900 shadow-[inset_0_-6px_0_theme(colors.slate.200)] flex items-center justify-center flex-shrink-0 transform rotate-3 group-hover:rotate-0 transition-transform">
                                        <Stethoscope size={40} strokeWidth={3} className="text-purple-500" />
                                    </div>
                                    <div className="mt-2 md:mt-2 flex-1 relative pr-8">
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tight">Medical Staff</h4>
                                        <p className="text-base font-bold text-slate-900/80 mt-2 leading-relaxed">Utilize the global/individual query tools securely.</p>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-white border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[0_6px_0_theme(colors.slate.900)] group-hover:shadow-[0_2px_0_theme(colors.slate.900)] group-hover:translate-y-[4px] transition-all">
                                           <ChevronRight size={24} strokeWidth={4} className="text-slate-900 ml-1" />
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* 3D Login Form View */
                        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out">
                            <button 
                                onClick={() => { setLoginType(null); setError(''); setUsername(''); setPassword(''); }}
                                className="flex items-center gap-2 text-base font-black text-slate-800 hover:text-slate-900 transition-all mb-10 w-fit px-5 py-3 rounded-2xl bg-white border-4 border-slate-900 shadow-[0_6px_0_theme(colors.slate.900)] hover:shadow-[0_2px_0_theme(colors.slate.900)] hover:translate-y-[4px]"
                            >
                                <ArrowLeft size={20} strokeWidth={3} /> Change Portal
                            </button>
                            
                            <div className="mb-10 flex flex-col items-center md:items-start text-center md:text-left">
                                <div className={`w-20 h-20 rounded-[24px] border-4 border-slate-900 shadow-[inset_0_-8px_0_rgba(0,0,0,0.15)] flex items-center justify-center mb-6 transform -rotate-6 ${loginType === 'doctor' ? 'bg-fuchsia-400 text-slate-900' : 'bg-cyan-400 text-slate-900'}`}>
                                    {loginType === 'doctor' ? <Stethoscope size={40} strokeWidth={2.5} /> : <User size={40} strokeWidth={2.5} />}
                                </div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
                                    {loginType === 'doctor' ? 'Provider Identity' : 'Patient Auth'}
                                </h3>
                                <p className="text-slate-600 mt-3 font-bold text-base leading-relaxed bg-slate-200/50 p-4 rounded-2xl border-2 border-slate-300 border-dashed">
                                    Punch in your vibrant credentials to access the portal.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-rose-500 text-white p-4 rounded-2xl text-sm font-black flex items-center gap-3 border-4 border-slate-900 shadow-[0_6px_0_theme(colors.slate.900)] animate-in fade-in">
                                        <div className="w-10 h-10 rounded-xl bg-white border-4 border-slate-900 flex items-center justify-center flex-shrink-0 text-2xl shadow-[inset_0_-4px_0_theme(colors.slate.200)]">
                                            ⚠️
                                        </div>
                                        <span className="text-base tracking-wide flex-1">{error}</span>
                                    </div>
                                )}
                                
                                <div className="space-y-2 relative">
                                    <label className="block text-sm font-black tracking-widest text-slate-700 uppercase ml-2 bg-white px-3 py-1 rounded-full border-2 border-slate-900 w-fit absolute -top-4 left-4 z-10 shadow-[0_4px_0_theme(colors.slate.900)]">
                                        {loginType === 'doctor' ? 'Staff ID' : 'Patient ID'}
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full px-6 pt-7 pb-5 bg-white border-4 border-slate-900 rounded-3xl focus:ring-0 outline-none transition-all font-black text-slate-900 text-lg shadow-[inset_0_6px_0_rgba(200,210,225,0.4)] ${loginType === 'doctor' ? 'focus:border-fuchsia-500' : 'focus:border-cyan-500'}`}
                                        placeholder={loginType === 'doctor' ? "dr.smith@hospital.com" : "Enter ID"}
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2 relative pt-4">
                                    <label className="block text-sm font-black tracking-widest text-slate-700 uppercase ml-2 bg-white px-3 py-1 rounded-full border-2 border-slate-900 w-fit absolute -top-0 left-4 z-10 shadow-[0_4px_0_theme(colors.slate.900)]">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        className={`w-full px-6 pt-7 pb-5 bg-white border-4 border-slate-900 rounded-3xl focus:ring-0 outline-none transition-all font-black text-slate-900 text-lg shadow-[inset_0_6px_0_rgba(200,210,225,0.4)] ${loginType === 'doctor' ? 'focus:border-fuchsia-500' : 'focus:border-cyan-500'}`}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full text-slate-900 py-5 mt-10 rounded-3xl font-black text-xl border-4 border-slate-900 transition-all shadow-[0_12px_0_theme(colors.slate.900)] hover:shadow-[0_4px_0_theme(colors.slate.900)] hover:translate-y-[8px] active:shadow-none active:translate-y-[12px] flex justify-center items-center gap-4 ${loginType === 'doctor' ? 'bg-fuchsia-400 hover:bg-fuchsia-300' : 'bg-cyan-400 hover:bg-cyan-300'} disabled:bg-slate-300 disabled:shadow-none disabled:translate-y-[12px]`}
                                >
                                    {isLoading ? <Activity className="animate-spin text-slate-900" size={32} strokeWidth={3} /> : 'AUTHENTICATE!'}
                                    {!isLoading && <div className="w-10 h-10 bg-white border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[inset_0_-4px_0_theme(colors.slate.200)]"><ChevronRight size={24} strokeWidth={4} /></div>}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}