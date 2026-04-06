import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { chatAPI } from '../api';
import { jwtDecode } from 'jwt-decode';
import { MessageSquare, Lock, Unlock, CheckSquare, Square, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';




export default function PatientDashboard() {
    const [records, setRecords] = useState([]);
    const [patientName, setPatientName] = useState('Patient');
    const [patientId, setPatientId] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedDates, setSelectedDates] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const [chatQuery, setChatQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPatientData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                // Decode token to get the patient's ID (stored as 'sub' or 'id')
                const decoded = jwtDecode(token);
                const decodedPatientId = decoded.sub; 
                setPatientId(decodedPatientId);
                setPatientName(decoded.username || "Valued Patient");

                // Fetch medical records for this specific patient
                const response = await api.get(`/records/${decodedPatientId}`);
                setRecords(response.data);
            } catch (err) {
                console.error("Error fetching patient data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPatientData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleSelectAll = () => {
        if (selectedDates.length === records.length) {
            setSelectedDates([]);
        } else {
            setSelectedDates(records.map((r, i) => r.id || r.created_at || i.toString()));
        }
    };

    const toggleSelectDate = (dateId) => {
        setSelectedDates(prev => 
            prev.includes(dateId) 
                ? prev.filter(d => d !== dateId)
                : [...prev, dateId]
        );
    };

    const isUnlocked = selectedDates.length > 0;

    const handleChatSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!chatQuery.trim() || !isUnlocked || isTyping) return;
        
        const currentQuery = chatQuery;
        setChatQuery('');
        
        setChatHistory(prev => [...prev, { role: 'user', content: currentQuery }]);
        setIsTyping(true);
        
        try {
            const decoded = jwtDecode(localStorage.getItem('token'));
            const response = await chatAPI.query(currentQuery, decoded.sub, selectedDates);
            setChatHistory(prev => [...prev, { role: 'ai', content: response.answer }]);
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'ai', content: 'Connection to AI Engine failed.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 pt-10">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* Dashboard Header */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                            <Calendar size={28} strokeWidth={2} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Welcome, {patientName}</h1>
                            <p className="text-slate-500 font-medium tracking-wide text-sm mt-1">
                                Patient Dashboard <span className="font-bold text-slate-300 mx-2">|</span> ID: <span className="font-bold text-slate-700">{patientId}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 hover:shadow-sm transition-all focus:ring-4 focus:ring-red-100">
                        Log Out
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Gatekeeper: Select Visit Records */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[650px]">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Calendar size={20} /></span>
                            Select Visit Records
                        </h2>
                        
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {loading ? (
                                <div className="animate-pulse flex flex-col gap-4 mt-2">
                                    <div className="h-16 bg-slate-100 rounded-2xl"></div>
                                    <div className="h-16 bg-slate-100 rounded-2xl"></div>
                                    <div className="h-16 bg-slate-100 rounded-2xl"></div>
                                </div>
                            ) : records.length > 0 ? (
                                <div className="space-y-3 pb-4">
                                    <div 
                                        onClick={handleSelectAll}
                                        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors border-b border-white hover:border-slate-200 font-bold text-slate-700 select-none"
                                    >
                                        {selectedDates.length === records.length ? <CheckSquare className="text-blue-600" size={22} /> : <Square className="text-slate-300" size={22} />}
                                        Select All Visits
                                    </div>
                                    
                                    <div className="border-t border-slate-100 my-2"></div>
                                    
                                    {records.map((rec, index) => {
                                        const recId = rec.id || rec.created_at || index.toString();
                                        const isSelected = selectedDates.includes(recId);
                                        const dateStr = new Date(rec.created_at || Date.now()).toLocaleDateString();
                                        return (
                                            <div 
                                                key={recId}
                                                onClick={() => toggleSelectDate(recId)}
                                                className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm transform scale-[1.01]' : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'}`}
                                            >
                                                <div className="mt-1 flex-shrink-0 transition-transform">
                                                    {isSelected ? <CheckSquare className="text-blue-600" size={22} /> : <Square className="text-slate-300" size={22} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-800 text-lg truncate">{rec.diagnosis || "General Checkup"} - {dateStr}</h3>
                                                    <p className="text-sm text-slate-500 mt-1.5 flex align-top gap-1 line-clamp-2 leading-relaxed">
                                                        <span className="font-semibold text-slate-600">Treatment:</span> {rec.treatment || "Routine evaluation and maintenance."}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 font-medium">
                                    <Calendar size={48} className="text-slate-200 mb-4" />
                                    <p>No records found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chatbox section */}
                    <div className={`rounded-3xl border transition-all duration-700 ease-out overflow-hidden flex flex-col h-[650px] relative ${isUnlocked ? 'bg-white border-blue-200 shadow-xl shadow-blue-100/50' : 'bg-slate-50 border-slate-200 opacity-90'}`}>
                        {/* Chat Header */}
                        <div className={`p-6 border-b flex items-center justify-between transition-colors duration-500 ${isUnlocked ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-none' : 'bg-slate-100 border-slate-200'}`}>
                            <h2 className={`text-xl font-bold flex items-center gap-3 ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                                {isUnlocked ? <Unlock size={22} className="text-blue-100" /> : <Lock size={22} className="text-slate-400" />} 
                                Medical AI Assistant
                            </h2>
                            {isUnlocked && (
                                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-white backdrop-blur-sm shadow-sm ring-1 ring-white/30">
                                    Ready
                                </div>
                            )}
                        </div>
                        
                        {/* Chat Body */}
                        <div className="flex-1 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-10">
                            <div className="w-full h-full flex flex-col z-10">
                                {isUnlocked ? (
                                    <>
                                        {/* Status Bar / Context Chip */}
                                        <div className="bg-blue-50 text-blue-700 px-5 py-2 rounded-full text-sm font-bold mx-auto mb-6 shadow-sm border border-blue-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                            Analyzing {selectedDates.length} selected visit{selectedDates.length > 1 && 's'}
                                        </div>
                                        
                                        {/* Messages Area */}
                                        <div className="flex-1 overflow-y-auto space-y-5 text-left pb-4 custom-scrollbar pr-2">
                                            {chatHistory.length === 0 ? (
                                                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                                        <Activity size={20} className="text-white" />
                                                    </div>
                                                    <div className="bg-slate-100 text-slate-800 p-4 rounded-2xl rounded-tl-sm w-fit max-w-[85%] shadow-sm border border-slate-200/60 leading-relaxed font-medium text-sm">
                                                        Hello {patientName}, I have analyzed your {selectedDates.length} selected records. I can help summarize your past treatments or answer any questions about your diagnosis. What would you like to know?
                                                    </div>
                                                </div>
                                            ) : (
                                                chatHistory.map((msg, idx) => (
                                                   <div key={idx} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${msg.role === 'user' ? 'bg-slate-800' : 'bg-gradient-to-br from-blue-500 to-indigo-500'}`}>
                                                            {msg.role === 'user' ? <User size={20} className="text-white" /> : <Activity size={20} className="text-white" />}
                                                         </div>
                
                
                                                       <div className={`p-4 rounded-2xl w-fit max-w-[85%] shadow-sm leading-relaxed font-medium text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 border border-slate-200/60 rounded-tl-sm'}`}>
                                                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                       </div>
                                                    </div>
                                                ))
                                            )}
                                            
                                            {isTyping && (
                                                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                                        <Activity size={20} className="text-white" />
                                                    </div>
                                                    <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-sm border border-slate-200/60 flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></div>
                                                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <div className="max-w-sm space-y-5 transition-opacity duration-500">
                                            <div className="mx-auto w-20 h-20 bg-slate-200/80 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-300/30"></div>
                                                <Lock size={36} className="text-slate-400 z-10" />
                                            </div>
                                            <h3 className="text-2xl font-extrabold text-slate-700 tracking-tight">Chat Locked</h3>
                                            <p className="text-slate-500 font-medium leading-relaxed px-4">
                                                Please select at least one visit record from the left panel to unlock context-aware insights.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Chat Input */}
                                <div className="mt-4 pt-4 relative animate-in fade-in duration-1000 bg-white">
                                    <form onSubmit={handleChatSubmit}>
                                        <input 
                                            type="text" 
                                            value={chatQuery}
                                            disabled={!isUnlocked}
                                            onChange={(e) => setChatQuery(e.target.value)}
                                            placeholder={isUnlocked ? "Type your medical query..." : "Please select a visit record to ask a query..."}
                                            className="w-full bg-slate-50 border border-slate-200 px-6 py-4 rounded-full focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white outline-none pr-14 text-slate-700 font-medium transition-all shadow-inner disabled:opacity-60 disabled:cursor-not-allowed" 
                                        />
                                        <button type="submit" disabled={!isUnlocked || isTyping || !chatQuery.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 p-2.5 rounded-full text-white hover:bg-blue-700 shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none">
                                            <MessageSquare size={20} fill={isUnlocked ? "currentColor" : "none"} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Ensure Activity is imported
function Activity(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
}