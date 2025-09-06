import React, { useEffect, useState } from 'react'
import { motion, useSpring } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  suffix?: string
  prefix?: string
  className?: string
}

export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  decimals = 0, 
  suffix = '', 
  prefix = '',
  className = ''
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  
  useEffect(() => {
    let startTime: number
    let animationFrame: number
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = easeOutQuart * value
      
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [value, duration])
  
  const formattedValue = decimals > 0 
    ? displayValue.toFixed(decimals)
    : Math.floor(displayValue).toString()
  
  return (
    <motion.span 
      className={className}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}{formattedValue}{suffix}
    </motion.span>
  )
}

// Achievement celebration animation
export function AchievementCelebration({ achievement, onComplete }: { 
  achievement: { name: string, description: string }, 
  onComplete: () => void 
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <motion.div
        className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Achievement Unlocked!
          </h3>
          <h4 className="text-xl text-yellow-100 mb-2">
            {achievement.name}
          </h4>
          <p className="text-yellow-100 opacity-90">
            {achievement.description}
          </p>
        </motion.div>
        
        {/* Confetti effect */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 bg-yellow-300 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -200, 200],
              rotate: [0, 360],
              opacity: [1, 0],
            }}
            transition={{
              duration: 2,
              delay: Math.random() * 0.5,
              ease: "easeOut"
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}

// Level up celebration
export function LevelUpCelebration({ newLevel, onComplete }: { 
  newLevel: number, 
  onComplete: () => void 
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <motion.div
        className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
        initial={{ scale: 0, y: 100 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0, y: -100 }}
        transition={{ type: "spring", duration: 0.8 }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-6xl mb-4"
        >
          👑
        </motion.div>
        
        <motion.h3 
          className="text-3xl font-bold text-white mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Level Up!
        </motion.h3>
        
        <motion.div 
          className="text-5xl font-bold text-yellow-300 mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
        >
          {newLevel}
        </motion.div>
        
        <motion.p 
          className="text-green-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          You've reached level {newLevel}! Keep up the great work!
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

// Progress bar with animation
export function AnimatedProgressBar({ 
  value, 
  max = 100, 
  className = '',
  showLabel = true,
  color = 'green'
}: {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  color?: 'green' | 'emerald' | 'lime' | 'teal'
}) {
  const percentage = Math.min((value / max) * 100, 100)
  
  const colorClasses = {
    green: 'bg-green-500',
    emerald: 'bg-emerald-500',
    lime: 'bg-lime-500',
    teal: 'bg-teal-500'
  }
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {value} / {max}
          </span>
        )}
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <motion.div
          className={`h-3 rounded-full ${colorClasses[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

// XP Badge component
export function XPBadge({ points, className = '' }: { points: number, className?: string }) {
  return (
    <motion.div
      className={`inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold text-sm shadow-lg ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="mr-1">⚡</span>
      <AnimatedCounter value={points} suffix=" XP" />
    </motion.div>
  )
}
