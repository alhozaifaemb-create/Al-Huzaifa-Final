'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      // 🟢 Animation Settings
      initial={{ opacity: 0, y: 20 }} // When page loads: Invisible & slightly down
      animate={{ opacity: 1, y: 0 }}  // Final state: Visible & in normal position
      transition={{ ease: 'easeOut', duration: 0.3 }} // Smooth & fast (0.3s)
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}