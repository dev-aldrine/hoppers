'use client';

import { motion, useSpring, useTransform } from 'motion/react';
import React, { useEffect, useMemo } from 'react';

import './Counter.css';

function Number({ mv, number, height }) {
  let y = useTransform(mv, latest => {
    let placeValue = latest % 10;
    let offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) {
      memo -= 10 * height;
    }
    return memo;
  });
  return (
    <motion.span className="counter-number" style={{ y }}>
      {number}
    </motion.span>
  );
}

function normalizeNearInteger(num) {
  const nearest = Math.round(num);
  const tolerance = 1e-9 * Math.max(1, Math.abs(num));
  return Math.abs(num - nearest) < tolerance ? nearest : num;
}

function getValueRoundedToPlace(value, place) {
  const scaled = value / place;
  return Math.floor(normalizeNearInteger(scaled));
}

function Digit({ place, value, height, digitStyle }) {
  const isDecimal = place === '.';
  const isComma = place === ',';
  const isStatic = isDecimal || isComma;
  const valueRoundedToPlace = isStatic ? 0 : getValueRoundedToPlace(value, place);
  const animatedValue = useSpring(valueRoundedToPlace, {
    stiffness: 280,
    damping: 30,
  });

  useEffect(() => {
    if (!isStatic) {
      animatedValue.set(valueRoundedToPlace);
    }
  }, [animatedValue, valueRoundedToPlace, isStatic]);

  if (isDecimal || isComma) {
    return (
      <span className="counter-digit" style={{ height, ...digitStyle, width: '0.35ch' }}>
        {place}
      </span>
    );
  }

  return (
    <span className="counter-digit" style={{ height, ...digitStyle }}>
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </span>
  );
}

export default function Counter({
  value,
  fontSize = 100,
  padding = 0,
  places,
  gap = 4,
  borderRadius = 4,
  horizontalPadding = 4,
  textColor = 'inherit',
  fontWeight = 'inherit',
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight = 0,
  gradientFrom = 'transparent',
  gradientTo = 'transparent',
  topGradientStyle,
  bottomGradientStyle
}) {
  const height = fontSize + padding;

  const resolvedPlaces = useMemo(() => {
    if (places) return places;
    const str = Math.round(value || 0).toString();
    const a = [...str];
    return a.map((ch, i) => {
      if (ch === '.') return '.';
      return 10 ** (a.indexOf('.') === -1 ? a.length - i - 1 : i < a.indexOf('.') ? a.indexOf('.') - i - 1 : -(i - a.indexOf('.')));
    });
  }, [value, places]);

  const defaultCounterStyle = {
    fontSize,
    gap: gap,
    borderRadius: borderRadius,
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    color: textColor,
    fontWeight: fontWeight,
    direction: "ltr"
  };
  const defaultTopGradientStyle = {
    height: gradientHeight,
    background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`
  };
  const defaultBottomGradientStyle = {
    height: gradientHeight,
    background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`
  };
  return (
    <span className="counter-container" style={containerStyle}>
      <span className="counter-counter" style={{ ...defaultCounterStyle, ...counterStyle }}>
        {resolvedPlaces.map((place, index) => (
          <Digit key={`digit-${index}-${place}`} place={place} value={value} height={height} digitStyle={digitStyle} />
        ))}
      </span>
    </span>
  );
}
