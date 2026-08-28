import React from 'react';
import { motion } from 'motion/react';

export interface ScrollFadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  className?: string;
  viewportMargin?: string;
  once?: boolean;
  scale?: number;
}

export const ScrollFadeIn: React.FC<ScrollFadeInProps> = ({
  children,
  delay = 0,
  duration = 0.5,
  direction = 'up',
  distance = 20,
  className = '',
  viewportMargin = '-30px',
  once = true,
  scale = 1,
}) => {
  const getInitialOffset = () => {
    switch (direction) {
      case 'up': return { y: distance };
      case 'down': return { y: -distance };
      case 'left': return { x: distance };
      case 'right': return { x: -distance };
      case 'none': return {};
      default: return { y: distance };
    }
  };

  const initialProps: any = {
    opacity: 0,
    ...getInitialOffset(),
  };

  if (scale !== 1) {
    initialProps.scale = scale;
  }

  const animateProps: any = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
  };

  return (
    <motion.div
      initial={initialProps}
      whileInView={animateProps}
      viewport={{ once, margin: viewportMargin }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollFadeIn;
