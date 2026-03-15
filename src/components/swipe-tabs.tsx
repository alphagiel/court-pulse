"use client";

import { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  type PanInfo,
} from "framer-motion";

interface SwipeTabsProps<T extends string> {
  tabs: { value: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
  children: (active: T) => React.ReactNode;
  /** Tailwind classes for the active indicator (defaults to white bg) */
  activeClass?: string;
  /** Tailwind classes for the active label text */
  activeLabelClass?: string;
  /** Tailwind classes for inactive label text */
  inactiveLabelClass?: string;
  /** layoutId namespace — must be unique per instance on the same page */
  id?: string;
  /** Disable swipe gesture (keep indicator animation) */
  disableSwipe?: boolean;
}

const SWIPE_THRESHOLD = 50; // px distance
const SWIPE_VELOCITY = 300; // px/s

const contentVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 180 : -180,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -180 : 180,
    opacity: 0,
  }),
};

export function SwipeTabs<T extends string>({
  tabs,
  active,
  onChange,
  children,
  activeClass = "bg-background shadow-sm",
  activeLabelClass = "text-foreground",
  inactiveLabelClass = "text-muted-foreground hover:text-foreground",
  id = "swipe-tabs",
  disableSwipe = false,
}: SwipeTabsProps<T>) {
  const activeIndex = tabs.findIndex((t) => t.value === active);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function goTo(value: T) {
    const newIndex = tabs.findIndex((t) => t.value === value);
    setDirection(newIndex > activeIndex ? 1 : -1);
    onChange(value);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    const swipedLeft =
      offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY;
    const swipedRight =
      offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY;

    if (swipedLeft && activeIndex < tabs.length - 1) {
      goTo(tabs[activeIndex + 1].value);
    } else if (swipedRight && activeIndex > 0) {
      goTo(tabs[activeIndex - 1].value);
    }
  }

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 relative">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => goTo(t.value)}
            className="flex-1 relative z-10 text-[13px] font-medium py-2 rounded-md transition-colors capitalize"
          >
            {/* Sliding indicator */}
            {active === t.value && (
              <motion.div
                layoutId={`${id}-indicator`}
                className={`absolute inset-0 rounded-md ${activeClass}`}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 ${
                active === t.value ? activeLabelClass : inactiveLabelClass
              }`}
            >
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* Swipeable content */}
      <div ref={containerRef} className="overflow-hidden touch-pan-y">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={active}
            custom={direction}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            {...(!disableSwipe && {
              drag: "x" as const,
              dragConstraints: { left: 0, right: 0 },
              dragElastic: 0.3,
              onDragEnd: handleDragEnd,
            })}
          >
            {children(active)}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
