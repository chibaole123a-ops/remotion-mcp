import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

const PARTICLES = Array.from({ length: 35 }).map((_, i) => ({
  id: i,
  x: (i * 137.5) % 100,
  y: (i * 293.3) % 100,
  size: (i % 5) * 4 + 6,
  speedY: ((i % 4) + 1) * 0.4,
  speedX: ((i % 3) - 1) * 0.25,
  delay: (i * 7) % 30,
  color: i % 2 === 0 ? '#00f2fe' : '#c471ed',
}));

export const DynamicVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring animation for the main title
  const scaleSpring = spring({
    frame: frame - 5,
    fps,
    config: {
      damping: 10,
      stiffness: 110,
      mass: 0.9,
    },
  });

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Exit fade out near the end (frames 105-120)
  const exitOpacity = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Rotating gradient angle
  const gradientAngle = interpolate(frame, [0, 120], [125, 165]);

  // Subtle glow pulse
  const glowSpread = interpolate(Math.sin(frame * 0.15), [-1, 1], [20, 45]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, #12062c 0%, #2a0845 35%, #1a2a6c 70%, #00d2ff 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        opacity: exitOpacity,
      }}
    >
      {/* Background Ambient Glow Circles */}
      <div
        style={{
          position: 'absolute',
          width: 750,
          height: 750,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(0,0,0,0) 70%)',
          top: '15%',
          left: '20%',
          transform: `scale(${1 + Math.sin(frame * 0.05) * 0.1})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 210, 255, 0.3) 0%, rgba(0,0,0,0) 70%)',
          bottom: '10%',
          right: '15%',
          transform: `scale(${1 + Math.cos(frame * 0.05) * 0.1})`,
        }}
      />

      {/* Floating Light Particles */}
      {PARTICLES.map((p) => {
        const currentY = (p.y - frame * p.speedY + 100) % 100;
        const currentX = (p.x + frame * p.speedX + 100) % 100;
        const pulse = Math.sin((frame + p.delay) * 0.12) * 0.35 + 0.65;
        const particleOpacity = interpolate(frame, [0, 20], [0, pulse], {
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${currentX}%`,
              top: `${currentY}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              boxShadow: `0 0 ${p.size * 1.5}px ${p.size * 0.6}px ${p.color}`,
              opacity: particleOpacity,
            }}
          />
        );
      })}

      {/* Center Content Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `scale(${scaleSpring})`,
          opacity: titleOpacity,
          zIndex: 10,
          padding: '40px 70px',
          borderRadius: 32,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 104,
            fontWeight: 900,
            letterSpacing: '5px',
            color: '#ffffff',
            textTransform: 'uppercase',
            textAlign: 'center',
            textShadow: `0 0 ${glowSpread}px rgba(0, 210, 255, 0.85), 0 10px 30px rgba(0, 0, 0, 0.6)`,
          }}
        >
          XIN CHÀO REMOTION
        </h1>

        {/* Animated Accent Line */}
        <div
          style={{
            marginTop: 24,
            width: interpolate(scaleSpring, [0, 1], [0, 480]),
            height: 6,
            borderRadius: 3,
            background: 'linear-gradient(90deg, transparent, #00f2fe, #c471ed, transparent)',
            boxShadow: '0 0 18px #00f2fe',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
