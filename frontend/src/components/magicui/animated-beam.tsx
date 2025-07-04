import React, { useEffect, useState } from "react";

interface AnimatedBeamProps {
  duration?: number;
  containerRef: React.RefObject<HTMLElement>;
  fromRef: React.RefObject<HTMLElement>;
  toRef: React.RefObject<HTMLElement>;
}

export const AnimatedBeam = ({
  duration = 2,
  containerRef,
  fromRef,
  toRef,
}: AnimatedBeamProps) => {
  const [path, setPath] = useState("M0 0 L0 0");

  useEffect(() => {
    const updatePath = () => {
      if (!fromRef.current || !toRef.current || !containerRef.current) return;
      const from = fromRef.current.getBoundingClientRect();
      const to = toRef.current.getBoundingClientRect();
      const container = containerRef.current.getBoundingClientRect();
      const startX = from.left + from.width / 2 - container.left;
      const startY = from.top + from.height / 2 - container.top;
      const endX = to.left + to.width / 2 - container.left;
      const endY = to.top + to.height / 2 - container.top;
      setPath(`M ${startX} ${startY} L ${endX} ${endY}`);
    };
    updatePath();
    window.addEventListener("resize", updatePath);
    return () => window.removeEventListener("resize", updatePath);
  }, [containerRef, fromRef, toRef]);

  return (
    <svg className="pointer-events-none absolute inset-0" fill="none">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="4 4"
        style={{
          animation: `dash ${duration}s linear infinite`,
        }}
      />
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: 8;
          }
        }
      `}</style>
    </svg>
  );
};
