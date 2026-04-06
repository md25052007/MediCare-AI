import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordsAPI, chatAPI, authAPI } from '../api';
import { jwtDecode } from 'jwt-decode';
import { Shield, Globe, User, Lock, Unlock, MessageSquare, RefreshCw, CheckSquare, Square, Search, Activity, SearchX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';


export default function DoctorDashboard() {
    const navigate = useNavigate();
    
    const [doctorName, setDoctorName] = useState('Doctor');
    const [isRegistering, setIsRegistering] = useState(false);
    const [newDocUsername, setNewDocUsername] = useState('');
    const [newDocPassword, setNewDocPassword] = useState('');
    const [registerStatus, setRegisterStatus] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const identity = decoded.username || decoded.sub || 'User';
                setDoctorName(identity);
            } catch (e) {
                navigate('/login');
            }
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const handleRegisterDoctor = async (e) => {
        e.preventDefault();
        setRegisterStatus('Registering...');
        try {
            await authAPI.register(newDocUsername, newDocPassword, 'doctor');
            setRegisterStatus('Success! Doctor registered.');
            setNewDocUsername('');
            setNewDocPassword('');
            setTimeout(() => { setIsRegistering(false); setRegisterStatus(''); }, 2000);
        } catch (err) {
            setRegisterStatus('Failed to register.');
        }
    };

    // Phase 1: Mode Selection
    const [queryMode, setQueryMode] = useState(null); // 'global' | 'individual'
    
    // Phase 2: Individual Patient State
    const [patientId, setPatientId] = useState('');
    const [searchedId, setSearchedId] = useState('');
    const [records, setRecords] = useState([]);
    const [error, setError] = useState('');
    const [selectedDates, setSelectedDates] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Chat State
    const [chatHistory, setChatHistory] = useState([]);
    const [chatQuery, setChatQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleResetContext = () => {
        setQueryMode(null);
        setPatientId('');
        setSearchedId('');
        setRecords([]);
        setSelectedDates([]);
        setError('');
        setChatHistory([]);
        setChatQuery('');
    };

    const searchPatient = async (e) => {
        if (e) e.preventDefault();
        if (!patientId.trim()) return;
        setError('');
        setIsSearching(true);
        setSelectedDates([]);
        setSearchedId(patientId);
        
        try {
            const data = await recordsAPI.getPatientRecords(patientId);
            setRecords(Array.isArray(data) ? data : [data]);
        } catch (err) {
            setError('Patient ID not found in database.');
            setRecords([]);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleSelectDate = (dateId) => {
        setSelectedDates(prev => 
            prev.includes(dateId) 
                ? prev.filter(d => d !== dateId)
                : [...prev, dateId]
        );
    };

    const handleSelectAll = () => {
        if (selectedDates.length === records.length) {
            setSelectedDates([]);
        } else {
            setSelectedDates(records.map((r, i) => r.id || r.created_at || i.toString()));
        }
    };

    const isUnlocked = queryMode === 'global' || (queryMode === 'individual' && selectedDates.length > 0);

    const handleChatSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!chatQuery.trim() || !isUnlocked || isTyping) return;
        
        const currentQuery = chatQuery;
        setChatQuery('');
        
        setChatHistory(prev => [...prev, { role: 'user', content: currentQuery }]);
        setIsTyping(true);
        
        try {
            const decoded = jwtDecode(localStorage.getItem('token'));
            const response = await chatAPI.query(
                currentQuery, 
                queryMode === 'global' ? null : searchedId, 
                queryMode === 'global' ? null : selectedDates
            );
            setChatHistory(prev => [...prev, { role: 'ai', content: response.answer }]);
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'ai', content: 'Connection to AI Engine failed or unauthorized context.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="h-screen bg-slate-50 flex pt-16 overflow-hidden">
            {/* Sidebar (Configuration & Gatekeeper) */}
            <div className="w-[420px] bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-10 flex-shrink-0">
                <div className="p-6 border-b border-slate-100 flex flex-col gap-2 bg-slate-50/50">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <Shield className="text-blue-600" size={24} /> Doctor Portal
                        </h1>
                        <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 text-sm font-bold transition-colors">
                            Log Out
                        </button>
                    </div>
                    <div className="text-sm font-bold text-slate-500 mt-1">Welcome, <span className="text-slate-700"> {doctorName}</span></div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative custom-scrollbar">
                    {/* Phase 1: Query Selection */}
                    <div className={`transition-all duration-500 ${queryMode !== null && 'opacity-60 grayscale-[50%] pointer-events-none sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-4 border-b border-slate-100'}`}>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Phase 1: Analytics Mode</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setQueryMode('global')}
                                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${queryMode === 'global' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm transform scale-[1.02]' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 text-slate-600 bg-white'}`}
                            >
                                <Globe size={28} className={queryMode === 'global' ? 'text-blue-600' : 'text-slate-400'} />
                                <span className="font-bold text-sm text-center">Global<br/>Database</span>
                            </button>
                            
                            <button 
                                onClick={() => setQueryMode('individual')}
                                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${queryMode === 'individual' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm transform scale-[1.02]' : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 text-slate-600 bg-white'}`}
                            >
                                <User size={28} className={queryMode === 'individual' ? 'text-indigo-600' : 'text-slate-400'} />
                                <span className="font-bold text-sm text-center">Individual<br/>Patient</span>
                            </button>
                        </div>
                    </div>

                    {/* Phase 2: Individual Patient Search & Selection */}
                    {queryMode === 'individual' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 opacity-100">
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4 flex justify-between items-end">
                                    <span>Phase 2: Authorization</span>
                                    {searchedId && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full normal-case tracking-normal">ID: {searchedId}</span>}
                                </h2>
                                
                                <form onSubmit={searchPatient} className="relative group">
                                    <input 
                                        type="text" 
                                        placeholder="Enter Patient ID..." 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium transition-all"
                                        value={patientId}
                                        onChange={(e) => setPatientId(e.target.value)}
                                    />
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <button type="submit" disabled={isSearching || !patientId.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                        {isSearching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                                    </button>
                                </form>
                                {error && <p className="text-red-500 mt-2 text-xs font-bold flex items-center gap-1.5"><SearchX size={14} /> {error}</p>}
                            </div>

                            {/* Patient Records Checkboxes */}
                            {records.length > 0 && (
                                <div className="space-y-3 pt-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                                    <div 
                                        onClick={handleSelectAll}
                                        className="flex items-center gap-3 py-2 px-1 cursor-pointer hover:text-indigo-600 transition-colors font-bold text-slate-700 text-sm select-none"
                                    >
                                        {selectedDates.length === records.length ? <CheckSquare className="text-indigo-600" size={18} /> : <Square className="text-slate-300" size={18} />}
                                        Select All {records.length} Visits
                                    </div>
                                    <div className="space-y-2">
                                        {records.map((rec, index) => {
                                            const recId = rec.id || rec.created_at || index.toString();
                                            const isSelected = selectedDates.includes(recId);
                                            const dateStr = new Date(rec.created_at || Date.now()).toLocaleDateString();
                                            return (
                                                <div 
                                                    key={recId}
                                                    onClick={() => toggleSelectDate(recId)}
                                                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-white border-indigo-300 shadow-sm ring-1 ring-indigo-500/10' : 'bg-white/50 border-transparent hover:bg-white hover:border-slate-200'}`}
                                                >
                                                    <div className="mt-0.5">
                                                        {isSelected ? <CheckSquare className="text-indigo-600" size={18} /> : <Square className="text-slate-300" size={18} />}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-sm">{rec.diagnosis || "Medical Appointment"}</h3>
                                                        <p className="text-xs text-slate-500 mt-0.5">{dateStr}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Admin Utilities */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto flex-shrink-0">
                    {!isRegistering ? (
                        <button onClick={() => setIsRegistering(true)} className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm">
                            + Register New Doctor
                        </button>
                    ) : (
                        <form onSubmit={handleRegisterDoctor} className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                            <h3 className="text-sm font-bold text-slate-700">Register Doctor</h3>
                            <input type="text" placeholder="Username" value={newDocUsername} onChange={e => setNewDocUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                            <input type="password" placeholder="Password" value={newDocPassword} onChange={e => setNewDocPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                            <div className="flex gap-2 pt-1">
                                <button type="submit" disabled={registerStatus.includes('Registering')} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold py-2 rounded-lg transition-colors">Submit</button>
                                <button type="button" onClick={() => setIsRegistering(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-lg transition-colors">Cancel</button>
                            </div>
                            {registerStatus && <p className={`text-xs font-bold text-center ${registerStatus.includes('Success') ? 'text-green-600' : 'text-red-500'}`}>{registerStatus}</p>}
                        </form>
                    )}
                </div>
            </div>

            {/* Main Area: Medical AI Chatbox */}
            <div className="flex-1 bg-slate-50/50 flex flex-col min-w-0 relative h-full">
                {/* View Overlay if no mode selected */}
                {queryMode === null && (
                    <div className="absolute inset-0 z-20 bg-slate-50/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 text-blue-500">
                            <Activity size={40} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">Select Analytics Mode</h2>
                        <p className="text-slate-500 max-w-md text-lg font-medium">Please choose between Global Database or Individual Patient query mode from the left sidebar to begin analysis.</p>
                    </div>
                )}
                
                {/* Chat Header Status */}
                <div className="h-16 border-b border-slate-200 bg-white flex items-center px-6 justify-between flex-shrink-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-3 w-3 relative">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUnlocked ? 'bg-green-400' : 'bg-slate-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${isUnlocked ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                        </span>
                        <h3 className="font-bold text-slate-700">Copilot Status: {isUnlocked ? 'Active' : 'Locked'}</h3>
                    </div>

                    <div className="flex items-center gap-4">
                        {queryMode && (
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${queryMode === 'global' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}`}>
                                {queryMode === 'global' ? 'Context: Global Mode' : `Context: Patient #${searchedId || 'Pending'} | ${selectedDates.length} Dates`}
                            </div>
                        )}
                        {queryMode !== null && (
                            <button onClick={handleResetContext} className="bg-white border border-slate-200 shadow-sm flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors">
                                <RefreshCw size={14} /> Change Context
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-10 relative">
                    {!isUnlocked && queryMode === 'individual' && (
                        <div className="m-auto text-center space-y-5">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md mx-auto border-4 border-slate-50">
                                <Lock size={40} className="text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-700">Authorization Required</h3>
                                <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto">Please identify a patient and explicitly authorize access to specific visit records to unlock the AI Copilot.</p>
                            </div>
                        </div>
                    )}

                    {isUnlocked && (
                        <div className="space-y-6 max-w-4xl mx-auto w-full">
                            {chatHistory.length === 0 ? (
                                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                        <Activity size={20} className="text-white" />
                                    </div>
                                    <div className="bg-white text-slate-800 p-5 rounded-2xl rounded-tl-sm w-fit max-w-[85%] shadow-sm border border-slate-200 leading-relaxed font-medium text-[15px]">
                                        {queryMode === 'global' 
                                            ? "Global Mode Active: I am actively surveying the entire clinical database. You can query cross-patient analytics, such as 'Find all patients over 60 with hypertension' or 'Show efficacy of recent statin treatments'." 
                                            : `Patient context loaded. I'm analyzing the ${selectedDates.length} authorized visits for patient ID #${searchedId}. How can I assist with this specific record?`}
                                    </div>
                                </div>
                            ) : (
                                chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${msg.role === 'user' ? 'bg-slate-800' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                                            {msg.role === 'user' ? <User size={20} className="text-white" /> : <Activity size={20} className="text-white" />}
                                        </div>
                                        <div className={`p-5 rounded-2xl w-fit max-w-[85%] shadow-sm leading-relaxed font-medium text-[15px] ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-sm ' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm '}`}>
                                         {msg.role === 'user' ? (
                                           msg.content
                                           ) : (
                                            <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-li:my-1">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                             )}
                                          </div>
                                     </div>
                                ))
                            )}
                            
                            {isTyping && (
                                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                        <Activity size={20} className="text-white" />
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></div>
                                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
                    <form onSubmit={handleChatSubmit} className="relative max-w-4xl mx-auto flex items-center">
                        <MessageSquare className="absolute left-6 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            disabled={!isUnlocked}
                            value={chatQuery}
                            onChange={(e) => setChatQuery(e.target.value)}
                            placeholder={isUnlocked ? "Type a specialized medical query..." : "Awaiting authorization..."}
                            className="w-full bg-slate-50 border border-slate-200 py-4 pl-14 pr-16 rounded-full focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-slate-700 font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
                        />
                         <button type="submit" disabled={!isUnlocked || isTyping || !chatQuery.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-800 p-2.5 rounded-full text-white hover:bg-black disabled:bg-slate-300 disabled:shadow-none shadow-md transition-all active:scale-95 disabled:opacity-50">
                            <Activity size={20} />
                        </button>
                    </form>
                    <div className="text-center mt-3 text-[11px] font-bold text-slate-400 tracking-wider">
                        SECURE HEALTH INSURANCE PORTABILITY AND ACCOUNTABILITY ACT (HIPAA) COMPLIANT AI
                    </div>
                </div>
            </div>
        </div>
    );
}