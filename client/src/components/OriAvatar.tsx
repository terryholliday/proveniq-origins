import { motion } from 'framer-motion';

interface OriAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export default function OriAvatar({ 
  size = 'md', 
  state = 'idle',
  className = '' 
}: OriAvatarProps) {
  const dimension = sizeMap[size];
  const innerSize = dimension * 0.6;
  
  // Animation variants based on state
  const pulseVariants = {
    idle: {
      scale: [1, 1.05, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    listening: {
      scale: [1, 1.1, 1],
      opacity: [0.9, 1, 0.9],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    thinking: {
      scale: [1, 1.08, 1.02, 1.08, 1],
      opacity: 1,
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    speaking: {
      scale: [1, 1.12, 1.05, 1.1, 1],
      opacity: 1,
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  const glowVariants = {
    idle: {
      opacity: [0.3, 0.5, 0.3],
      scale: [1, 1.1, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    listening: {
      opacity: [0.4, 0.7, 0.4],
      scale: [1, 1.2, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    thinking: {
      opacity: [0.5, 0.8, 0.5],
      scale: [1, 1.15, 1],
      rotate: [0, 180, 360],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "linear" as const
      }
    },
    speaking: {
      opacity: [0.6, 1, 0.6],
      scale: [1, 1.25, 1],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  // Eye blink animation
  const eyeVariants = {
    open: { scaleY: 1 },
    blink: { 
      scaleY: [1, 0.1, 1],
      transition: {
        duration: 0.15,
        times: [0, 0.5, 1]
      }
    }
  };

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(217, 119, 87, 0.4) 0%, rgba(217, 119, 87, 0) 70%)',
        }}
        variants={glowVariants}
        animate={state}
      />
      
      {/* Secondary glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: dimension * 0.85,
          height: dimension * 0.85,
          background: 'radial-gradient(circle, rgba(72, 213, 192, 0.3) 0%, rgba(72, 213, 192, 0) 60%)',
        }}
        animate={{
          rotate: [0, 360],
          transition: {
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }
        }}
      />

      {/* Main avatar circle */}
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: innerSize,
          height: innerSize,
          background: 'linear-gradient(135deg, #D97757 0%, #c56a4d 50%, #D97757 100%)',
          boxShadow: '0 4px 20px rgba(217, 119, 87, 0.4), inset 0 2px 10px rgba(255, 255, 255, 0.2)',
        }}
        variants={pulseVariants}
        animate={state}
      >
        {/* Face container */}
        <div className="relative" style={{ width: innerSize * 0.6, height: innerSize * 0.4 }}>
          {/* Left eye */}
          <motion.div
            className="absolute bg-white rounded-full"
            style={{
              width: innerSize * 0.15,
              height: innerSize * 0.15,
              left: '15%',
              top: '20%',
            }}
            initial="open"
            animate="blink"
            variants={eyeVariants}
            transition={{
              repeat: Infinity,
              repeatDelay: 3 + Math.random() * 2,
            }}
          />
          
          {/* Right eye */}
          <motion.div
            className="absolute bg-white rounded-full"
            style={{
              width: innerSize * 0.15,
              height: innerSize * 0.15,
              right: '15%',
              top: '20%',
            }}
            initial="open"
            animate="blink"
            variants={eyeVariants}
            transition={{
              repeat: Infinity,
              repeatDelay: 3 + Math.random() * 2,
            }}
          />
          
          {/* Smile - curved line */}
          <motion.div
            className="absolute"
            style={{
              width: innerSize * 0.3,
              height: innerSize * 0.15,
              left: '35%',
              bottom: '10%',
              borderBottom: `${Math.max(2, innerSize * 0.04)}px solid white`,
              borderRadius: '0 0 50% 50%',
            }}
            animate={state === 'speaking' ? {
              scaleY: [1, 1.3, 0.8, 1.2, 1],
              transition: {
                duration: 0.4,
                repeat: Infinity,
              }
            } : {}}
          />
        </div>
      </motion.div>

      {/* Floating particles for thinking state */}
      {state === 'thinking' && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-[#48D5C0]"
              style={{
                width: 4,
                height: 4,
              }}
              animate={{
                y: [-10, -20, -10],
                x: [0, (i - 1) * 10, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
