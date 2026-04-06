import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50 px-6 flex items-center justify-between">
      {/* Branding */}
      <div className="flex items-center gap-2">
        <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
            <Activity size={24} strokeWidth={2.5} />
        </div>
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">
          Medicare <span className="text-blue-600">AI</span>
        </h1>
      </div>

      {/* Real-time Clock */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 text-sm font-medium text-gray-700 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
        <span>{formatDate(time)}</span>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-gray-600">{formatTime(time)}</span>
      </div>
      
      {/* Placeholder for symmetry / Future controls */}
      <div className="min-w-[100px] flex justify-end"></div>
    </header>
  );
}
