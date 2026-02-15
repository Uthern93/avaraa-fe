// =============================================================================
// NOT FOUND PAGE - 404
// =============================================================================

import React from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Home, ArrowLeft, Search } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md"
      >
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Search className="w-16 h-16 text-slate-300" />
          </div>
          <h1 className="text-6xl font-bold text-slate-200 mb-2">404</h1>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          Page Not Found
        </h2>
        <p className="text-slate-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home size={18} />
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default NotFound;
