import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// --- Bottom Sheet Component ---
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const SlideOver: React.FC<BottomSheetProps> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'var(--bg-primary)',
            zIndex: 9002,
            overflowY: 'auto'
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — z-index well above nav (45) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 9000
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                onClose();
              }
            }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              backgroundColor: 'var(--bg-elevated)',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              padding: '0 1.5rem',
              paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))',
              zIndex: 9001,
              boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            {/* Handle bar */}
            <div style={{ width: '36px', height: '4px', backgroundColor: 'rgba(0,0,0,0.10)', borderRadius: '2px', margin: '0 auto 1.25rem auto' }} />

            {(title || !!onClose) && (
              <div className="flex-row justify-between align-center mb-4">
                {title ? <h2 className="text-h2 m-0">{title}</h2> : <div />}
                {onClose && (
                  <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', padding: '8px', borderRadius: '50%', display: 'flex', cursor: 'pointer' }}>
                    <X size={18} color="rgba(0,0,0,0.40)" />
                  </button>
                )}
              </div>
            )}

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- Swipe Reveal Component ---
interface SwipeRevealProps {
  onDelete: () => void;
  children: React.ReactNode;
}

export const SwipeReveal: React.FC<SwipeRevealProps> = ({ onDelete, children }) => {
  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x < -100) {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      onDelete();
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width: '100%', borderRadius: 'var(--radius-sm)' }}>
      {/* Background action (Trash) */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0, bottom: 0, left: 0,
        backgroundColor: 'var(--accent-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: '1.5rem',
        borderRadius: 'var(--radius-sm)',
        zIndex: 0
      }}>
        <Trash2 color="white" size={20} />
      </div>

      {/* Foreground Draggable Item */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'var(--bg-card)', // Assumes items sit in a card context
          width: '100%',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
