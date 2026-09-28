'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
  useCallback,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './GooeyInput.css';

function GooeyFilter({ filterId, blur = 3.5 }) {
  return (
    <svg className="gooey-svg-filter" aria-hidden="true">
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

function SearchIcon({ className = '', onClick }) {
  return (
    <svg
      onClick={onClick}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      className={`gooey-icon-svg ${className}`}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// Spring physics for authentic liquid stretching
const springTransition = {
  type: 'spring',
  stiffness: 380,
  damping: 24,
  mass: 0.8,
};

export function GooeyInput({
  placeholder = 'Search your dick',
  className = '',
  collapsedWidth = 120,
  expandedWidth = 195,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onOpenChange,
  disabled = false,
}) {
  const reactId = useId();
  const safeId = reactId.replace(/:/g, '');
  const filterId = `gooey-filter-${safeId}`;

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

  const isControlled = valueProp !== undefined;
  const searchText = isControlled ? valueProp : uncontrolledValue;

  const setSearchText = useCallback(
    (next) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  const setExpanded = useCallback(
    (next) => {
      setIsExpanded(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  // Focus input on expand
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  // Keep expanded if search text exists
  useEffect(() => {
    if (searchText && !isExpanded) {
      setIsExpanded(true);
    }
  }, [searchText, isExpanded]);

  // Transform coordinates for pixel-perfect droplet detachment:
  // When collapsed: main pill at center x=0 (w=120). Bubble at x=-42 (hidden inside left edge of pill).
  // When expanded: main pill shifts right to x=+24 (w=195). Bubble expands and emerges at left x=-106.
  const mainVariants = useMemo(
    () => ({
      collapsed: { width: collapsedWidth, x: 0 },
      expanded: { width: expandedWidth, x: 24 },
    }),
    [collapsedWidth, expandedWidth]
  );

  const bubbleVariants = useMemo(
    () => ({
      collapsed: { scale: 0, opacity: 0, x: -42 },
      expanded: { scale: 1, opacity: 1, x: -106 },
    }),
    []
  );

  const handleContainerClick = useCallback(() => {
    if (!disabled) {
      if (!isExpanded) {
        setExpanded(true);
      }
      inputRef.current?.focus();
    }
  }, [disabled, isExpanded, setExpanded]);

  const handleChange = useCallback(
    (e) => {
      setSearchText(e.target.value);
    },
    [setSearchText]
  );

  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      setSearchText('');
      inputRef.current?.focus();
    },
    [setSearchText]
  );

  const handleBlur = useCallback(
    (e) => {
      if (!containerRef.current?.contains(e.relatedTarget) && !searchText) {
        setExpanded(false);
      }
    },
    [searchText, setExpanded]
  );

  return (
    <div
      ref={containerRef}
      className={`gooey-input-root ${className}`}
      onClick={handleContainerClick}
    >
      <GooeyFilter filterId={filterId} blur={3.5} />

      <div className="gooey-stage">
        {/* 🟡 Layer 1: Morphing SVG Gooey Droplet Background */}
        <div className="gooey-liquid-layer" style={{ filter: `url(#${filterId})` }}>
          <motion.div
            className="gooey-main-blob"
            variants={mainVariants}
            initial="collapsed"
            animate={isExpanded ? 'expanded' : 'collapsed'}
            transition={springTransition}
          />
          <motion.div
            className="gooey-bubble-blob"
            variants={bubbleVariants}
            initial="collapsed"
            animate={isExpanded ? 'expanded' : 'collapsed'}
            transition={springTransition}
          />
        </div>

        {/* 📝 Layer 2: Interactive Foreground UI (Sharp text & icons) */}
        <div className="gooey-ui-layer">
          {/* Bubble Search Icon */}
          <motion.div
            className="gooey-bubble-icon-box"
            variants={bubbleVariants}
            initial="collapsed"
            animate={isExpanded ? 'expanded' : 'collapsed'}
            transition={springTransition}
            onClick={handleContainerClick}
          >
            <SearchIcon />
          </motion.div>

          {/* Main Search Pill Input */}
          <motion.div
            className="gooey-input-box"
            variants={mainVariants}
            initial="collapsed"
            animate={isExpanded ? 'expanded' : 'collapsed'}
            transition={springTransition}
          >
            {!isExpanded && <SearchIcon onClick={handleContainerClick} />}

            <input
              ref={inputRef}
              type="text"
              enterKeyHint="search"
              autoComplete="off"
              value={searchText}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              placeholder={isExpanded ? placeholder : 'Search...'}
              className="gooey-input-element"
              style={{ cursor: isExpanded ? 'text' : 'pointer' }}
            />

            <AnimatePresence>
              {searchText ? (
                <motion.button
                  type="button"
                  className="gooey-clear-btn"
                  onClick={handleClear}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.7, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.12 }}
                  title="Clear search"
                >
                  ✕
                </motion.button>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default GooeyInput;
