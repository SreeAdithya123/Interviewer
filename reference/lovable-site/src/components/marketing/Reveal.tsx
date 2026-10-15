import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** stagger index — child N animates after N * step seconds */
  index?: number;
  /** seconds between staggered children */
  step?: number;
  /** base delay in seconds */
  delay?: number;
  /** translate distance in px */
  y?: number;
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
  once?: boolean;
};

/**
 * Heavy fade-up-blur entrance. Elements never appear statically — they resolve
 * from `translateY + blur + opacity:0` over ~0.8s on a custom quint curve as
 * they cross into the viewport. Uses IntersectionObserver via Framer's
 * whileInView (no scroll listeners).
 */
export const Reveal = ({
  children,
  className,
  index = 0,
  step = 0.08,
  delay = 0,
  y = 26,
  as = 'div',
  once = true,
}: RevealProps) => {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  const variants: Variants = {
    hidden: reduce
      ? { opacity: 0 }
      : { opacity: 0, y, filter: 'blur(10px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
        delay: delay + index * step,
      },
    },
  };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-12% 0px -12% 0px' }}
    >
      {children}
    </MotionTag>
  );
};

export default Reveal;
