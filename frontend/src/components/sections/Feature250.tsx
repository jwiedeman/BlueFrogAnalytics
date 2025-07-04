"use client";

import { Cpu } from "lucide-react";
import React, { useRef } from "react";
import { AnimatedBeam } from "@/components/magicui/animated-beam";

const Feature250 = () => {
  return (
    <section className="py-32">
      <div className="container">
        <p className="mx-auto mb-4 max-w-sm text-center text-muted-foreground md:text-xl">
          Unlock Your Website's True Potential
        </p>
        <h1 className="mx-auto -mb-12 max-w-3xl text-center text-4xl font-medium tracking-tighter md:text-6xl lg:mb-5 lg:text-7xl">
          Your Optimal Business Awaits
        </h1>
        <AnimatedBeamIllustration />
      </div>
    </section>
  );
};

export { Feature250 };

function AnimatedBeamIllustration() {
  const containerRef = useRef(null);
  const featureRefs = Array.from({ length: 6 }, () => useRef(null));
  const optimalBizRef = useRef(null);

  const features = [
    "Website Building",
    "SEO Optimization",
    "Advanced Analytics",
    "Comprehensive Auditing",
    "Regulatory Compliance",
    "Lead Generation",
  ];

  return (
    <div
      className="relative flex w-full items-center justify-center overflow-hidden p-10"
      ref={containerRef}
    >
      <div className="flex w-full flex-col lg:flex-row items-center justify-between gap-10">
        <div className="relative flex flex-col gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <div
              key={feature}
              ref={featureRefs[index]}
              className="flex items-center gap-4"
            >
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted">
                <Cpu size={16} />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                {feature}
              </p>
            </div>
          ))}
        </div>

        <div
          ref={optimalBizRef}
          className="z-10 flex size-40 items-center justify-center rounded-3xl border bg-muted lg:size-52"
        >
          <img
            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-1.svg"
            className="size-20 lg:size-24"
            alt="Optimal Business"
          />
        </div>
      </div>

      {featureRefs.map((fromRef, index) => (
        <AnimatedBeam
          key={index}
          duration={3}
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={optimalBizRef}
        />
      ))}
    </div>
  );
}

const Icons = {
  zap: () => (
    <svg
      width="26"
      height="27"
      viewBox="0 0 26 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.0514 25.3465C9.9169 25.3467 9.78403 25.3173 9.6621 25.2606C9.54016 25.2039 9.43213 25.1211 9.34559 25.0182C9.25906 24.9153 9.19611 24.7946 9.16118 24.6648C9.12625 24.5349 9.12018 24.399 9.14339 24.2665V24.261L10.5535 16.5175H5.09406C4.94252 16.5175 4.79408 16.4745 4.66592 16.3937C4.53775 16.3128 4.43508 16.1974 4.3698 16.0606C4.30452 15.9239 4.27929 15.7714 4.29702 15.6209C4.31475 15.4704 4.37473 15.328 4.47001 15.2102L15.4647 1.61842C15.5899 1.45956 15.7636 1.34606 15.9593 1.29528C16.1551 1.2445 16.3621 1.25923 16.5487 1.33722C16.7353 1.41521 16.8912 1.55218 16.9926 1.72716C17.094 1.90214 17.1353 2.10552 17.1101 2.30619C17.1101 2.32123 17.1061 2.33578 17.1036 2.35083L15.6884 10.0963H21.1469C21.2985 10.0964 21.4469 10.1393 21.5751 10.2201C21.7032 10.301 21.8059 10.4164 21.8712 10.5532C21.9365 10.69 21.9617 10.8424 21.944 10.9929C21.9262 11.1434 21.8663 11.2858 21.771 11.4036L10.7748 24.9954C10.6884 25.1046 10.5784 25.1928 10.4532 25.2536C10.328 25.3144 10.1906 25.3462 10.0514 25.3465Z"
        fill="black"
      />
    </svg>
  ),
};
