import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OrientationCheck() {
  const navigate = useNavigate();
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [loadingWorld, setLoadingWorld] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", () => {
      setTimeout(checkOrientation, 100);
    });

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  useEffect(() => {
    if (isLandscape && !loadingWorld) {
      setLoadingWorld(true);
    }
  }, [isLandscape]);

  useEffect(() => {
    if (!loadingWorld) return;

    const interval = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate("/mobile"), 300);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [loadingWorld, navigate]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <AnimatePresence mode="wait">
        {!isLandscape && !loadingWorld ? (
          <motion.div
            key="rotate"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center px-8"
          >
            <motion.div
              animate={{ rotate: [0, -90, -90, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="w-24 h-36 mx-auto mb-8 border-4 border-cyan-400/60 rounded-2xl flex items-center justify-center"
            >
              <div className="w-4 h-4 bg-cyan-400/40 rounded-full" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">Rotate Your Device</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Please turn your phone sideways for the best in-world experience
            </p>

            <button
              onClick={() => setLoadingWorld(true)}
              className="mt-8 text-gray-500 text-xs hover:text-gray-300 underline"
            >
              Continue anyway
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center w-full max-w-md px-8"
          >
            <Loader2 className="w-10 h-10 text-cyan-400 mx-auto mb-6 animate-spin" />
            <h2 className="text-lg font-semibold text-white mb-2">Loading World...</h2>
            <p className="text-gray-500 text-sm mb-6">Connecting to region</p>

            <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(loadProgress, 100)}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            <p className="text-gray-600 text-xs mt-2">{Math.min(Math.round(loadProgress), 100)}%</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}