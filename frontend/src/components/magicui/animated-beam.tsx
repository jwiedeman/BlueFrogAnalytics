import React, { useEffect, useState } from "react";

interface AnimatedBeamProps {
  containerRef: React.RefObject<HTMLElement>;
  fromRef: React.RefObject<HTMLElement>;
  toRef: React.RefObject<HTMLElement>;
  duration?: number;
  curvature?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
  direction?: "horizontal" | "vertical";
  className?: string;
}

export const AnimatedBeam = ({
  containerRef,
  fromRef,
  toRef,
  duration = 2,
  curvature = 0,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
  direction = "horizontal",
  className,
}: AnimatedBeamProps) => {
  const [path, setPath] = useState("M0 0 L0 0");

  useEffect(() => {
    const updatePath = () => {
      if (!fromRef.current || !toRef.current || !containerRef.current) return;
      const from = fromRef.current.getBoundingClientRect();
      const to = toRef.current.getBoundingClientRect();
      const container = containerRef.current.getBoundingClientRect();

      const startX =
        from.left + from.width / 2 - container.left + startXOffset;
      const startY =
        from.top + from.height / 2 - container.top + startYOffset;
      const endX = to.left + to.width / 2 - container.left + endXOffset;
      const endY = to.top + to.height / 2 - container.top + endYOffset;

      let controlX = (startX + endX) / 2;
      let controlY = (startY + endY) / 2;

      if (direction === "horizontal") {
        controlY += curvature;
      } else {
        controlX += curvature;
      }

      setPath(`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`);
    };

    updatePath();
    window.addEventListener("resize", updatePath);
    window.addEventListener("scroll", updatePath, true);

    const observer = new ResizeObserver(updatePath);
    if (fromRef.current) observer.observe(fromRef.current);
    if (toRef.current) observer.observe(toRef.current);

    return () => {
      window.removeEventListener("resize", updatePath);
      window.removeEventListener("scroll", updatePath, true);
      observer.disconnect();
    };
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
    direction,
  ]);

  return (
    <svg
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
      fill="none"
    >
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="4 4"
        style={{ animation: `dash ${duration}s linear infinite` }}
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
