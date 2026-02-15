import React, { useState } from 'react';
import { 
  ScanBarcode, 
  Search, 
  ArrowRight, 
  Check, 
  MapPin
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

type ScannerMode = 'HOME' | 'SCANNING' | 'RESULT';

export function MobileScanner() {
  const [mode, setMode] = useState<ScannerMode>('HOME');
  const [scanResult, setScanResult] = useState<string>('');

  // Simulate scanning
  const handleScan = () => {
    setMode('SCANNING');
    setTimeout(() => {
      setScanResult('LGT-SPOT-500');
      setMode('RESULT');
      toast.success('Barcode Scanned Successfully');
    }, 1500);
  };

  if (mode === 'SCANNING') {
    return (
      <div className="flex flex-col h-full bg-black text-white relative">
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="w-full h-full bg-slate-800 animate-pulse"></div>
        </div>
        
        {/* Camera Overlay */}
        <div className="z-10 flex-1 flex flex-col items-center justify-center relative px-8">
           <div className="w-64 h-64 border-4 border-blue-500 rounded-2xl relative shadow-[0_0_100px_rgba(59,130,246,0.5)] overflow-hidden">
             <motion.div 
               initial={{ top: 0 }}
               animate={{ top: "100%" }}
               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
               className="absolute left-0 w-full h-1 bg-blue-400 shadow-[0_0_10px_#60a5fa]"
             />
           </div>
           <p className="mt-8 text-lg font-medium text-slate-300">Align barcode within frame</p>
        </div>

        <div className="z-20 p-6 bg-black/80 backdrop-blur-md">
          <button 
            onClick={() => setMode('HOME')}
            className="w-full py-4 bg-slate-700 text-white rounded-xl font-bold text-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'RESULT') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="p-6 bg-white shadow-sm">
           <div className="flex items-center gap-3 text-emerald-600 mb-2">
             <Check size={24} />
             <span className="font-bold text-lg">Scan Successful</span>
           </div>
           <h2 className="text-3xl font-bold text-slate-800">{scanResult}</h2>
           <p className="text-slate-500 mt-1">LED Spotlight 500W • Zone C</p>
        </div>

        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Location</span>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">A-01-02</p>
                <p className="text-sm text-slate-500">Zone A • Rack 1 • Level 2</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
             <div className="flex justify-between mb-2">
               <span className="text-sm text-slate-500">Expected Qty</span>
               <span className="font-bold text-slate-800">50</span>
             </div>
             <div className="flex justify-between">
               <span className="text-sm text-slate-500">Scanned Qty</span>
               <span className="font-bold text-blue-600">1</span>
             </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-200 grid grid-cols-2 gap-4">
           <button 
             onClick={() => setMode('HOME')}
             className="py-4 bg-slate-100 text-slate-700 rounded-xl font-bold"
           >
             Cancel
           </button>
           <button 
             onClick={() => {
               toast.success('Item Confirmed');
               setMode('HOME');
             }}
             className="py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200"
           >
             Confirm
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 max-w-md mx-auto border-x border-slate-200 shadow-2xl">
      <div className="bg-blue-600 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-lg relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="font-bold">JS</span>
            </div>
            <div>
              <p className="text-xs text-blue-100">Welcome back,</p>
              <p className="font-bold">John Staff</p>
            </div>
          </div>
          <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <Search size={20} />
          </button>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Ready to scan?</h1>
        <p className="text-blue-100 text-sm">Select a task or start scanning items.</p>
      </div>

      <div className="flex-1 px-6 -mt-8 z-20 overflow-y-auto pb-6 space-y-6">
        {/* Main Action */}
        <button 
          onClick={handleScan}
          className="w-full bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-between group active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md group-hover:bg-blue-600 transition-colors">
              <ScanBarcode size={28} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg text-slate-800">Scan Item</h3>
              <p className="text-slate-500 text-sm">Identify items or bins</p>
            </div>
          </div>
          <ArrowRight className="text-slate-300" />
        </button>

        <div>
          <h3 className="font-bold text-slate-800 mb-4 px-2">Pending Tasks</h3>
          <div className="space-y-3">
            {[
              { title: 'Putaway GRN-1029', loc: 'Dock A -> Zone B', count: 12, type: 'PUTAWAY' },
              { title: 'Pick DO-8821', loc: 'Zone A -> Pack 1', count: 4, type: 'PICK' },
              { title: 'Verify Returns', loc: 'Returns Area', count: 1, type: 'VERIFY' }
            ].map((task, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                       task.type === 'PUTAWAY' ? 'bg-purple-100 text-purple-700' :
                       task.type === 'PICK' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                     }`}>
                       {task.type}
                     </span>
                     <span className="text-xs text-slate-400">10m ago</span>
                   </div>
                   <h4 className="font-bold text-slate-800 text-sm">{task.title}</h4>
                   <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                     <MapPin size={10} /> {task.loc}
                   </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <span className="text-lg font-bold text-slate-700">{task.count}</span>
                   <button className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-bold rounded hover:bg-blue-50 hover:text-blue-600">
                     Start
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
