import { type SVGProps, useId } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const About8 = () => {
  return (
    <section className="py-32">
      {/* Hero Section */}
      <section className="relative container max-w-5xl py-10 md:py-12 lg:py-15">
        <div className="">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            A Seamless
            <br />
            Rhythm of Clarity
          </h1>
          <p className="mt-4 max-w-2xl text-2xl text-muted-foreground md:text-3xl">
            Blue Frog Analytics harmonizes tracking, SEO and compliance so your teams can focus on growth.
          </p>
        </div>
        {/* Background decoration */}
        <>
          <div className="absolute inset-0 z-[-1] -translate-y-1/2 blur-[100px] will-change-transform">
            <div className="bg-gradient-1/25 absolute top-0 right-0 h-[400px] w-[800px] -translate-x-1/5 rounded-full" />
            <div className="bg-gradient-2/10 absolute top-0 right-0 size-[400px] rounded-full" />
          </div>
          <div className="absolute -inset-40 z-[-1] [mask-image:radial-gradient(circle_at_center,black_0%,black_20%,transparent_80%)]">
            <PlusSigns className="h-full w-full text-foreground/[0.05]" />
          </div>
        </>
      </section>

      {/* Stats Section */}
      <section className="container max-w-5xl border-y py-5">
        <h2 className="font-mono text-sm font-semibold tracking-widest text-accent-foreground">
          By the numbers
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-4xl font-medium tracking-tight md:text-5xl lg:text-6xl">
              5K+
            </h3>
            <p className="mt-1 font-medium text-muted-foreground">Audits Run</p>
          </div>
          <div>
            <h3 className="text-4xl font-medium tracking-tight md:text-5xl lg:text-6xl">
              50+
            </h3>
            <p className="mt-1 font-medium text-muted-foreground">Integrations</p>
          </div>
          <div>
            <h3 className="text-4xl font-medium tracking-tight md:text-5xl lg:text-6xl">
              99%
            </h3>
            <p className="mt-1 font-medium text-muted-foreground">Client Retention</p>
          </div>
          <div>
            <h3 className="text-4xl font-medium tracking-tight md:text-5xl lg:text-6xl">
              2019
            </h3>
            <p className="mt-1 font-medium text-muted-foreground">Year Founded</p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container max-w-5xl py-10 md:py-12 lg:py-15">
        <div className="max-w-2xl space-y-5 md:space-y-8 lg:space-y-10">
          <p className="text-lg">
            Throughout my career as an analytics engineer, I saw talented teams bogged down by fragmented workflows and disconnected tools.
          </p>

          <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
            Why Blue Frog Analytics?
          </h2>
          <p className="text-lg">
            We act as the conductor behind your digital orchestra&mdash;harmonizing tracking, SEO, performance and compliance so everyone can collaborate.
          </p>
        </div>
      </section>

      {/* Image Grid Section */}
      <section className="my-5 pb-10 md:my-8 md:pb-12 lg:my-12 lg:pb-15">
        <Carousel
          opts={{
            align: "start",
          }}
        >
          <CarouselContent className="-ml-4">
            <CarouselItem className="basis-[80%] lg:basis-1/3 xl:basis-[40%]">
              <div className="relative h-[330px] lg:h-[440px] xl:h-[600px]">
                <img
                  src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                  alt="Team collaborating"
                  className="object-cover"
                />
              </div>
            </CarouselItem>
            <CarouselItem className="basis-[80%] lg:basis-1/3 xl:basis-[40%]">
              <div className="relative h-[330px] lg:h-[440px] xl:h-[600px]">
                <img
                  src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                  alt="Modern workspace"
                  className="object-cover"
                />
              </div>
            </CarouselItem>
            <CarouselItem className="basis-[80%] lg:basis-1/3 xl:basis-[40%]">
              <div className="relative h-[330px] lg:h-[440px] xl:h-[600px]">
                <img
                  src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                  alt="Blue Frog tooling"
                  className="object-cover"
                />
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </section>

      {/* CoreAPI Section */}
      <section className="container">
        <div className="mr-0 ml-auto max-w-2xl space-y-5 md:space-y-8 lg:space-y-10">
          <p className="text-lg">
            Blue Frog Analytics was created to simplify complexities and illuminate hidden opportunities for growth.
          </p>

          <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
            Bridging the Gap, Boosting Your Potential
          </h2>

          <p className="text-lg">
            We keep our team lean and focused so we can deliver actionable insights for developers and marketers alike.
          </p>
        </div>
      </section>

      {/* Founding Team Section */}
      <section className="container py-10 md:py-12 lg:py-15">
        <div className="grid gap-5 md:grid-cols-2 md:gap-10 lg:gap-16">
          <div className="order-2 md:order-1">
            <h2 className="text-4xl font-semibold tracking-tight md:text-4xl">
              The founding team
            </h2>
            <p className="mt-5 text-lg md:mt-6">
              We started building Blue Frog Analytics in 2019 and launched in 2022. Every feature is designed from the ground up to empower collaboration and clarity.
            </p>
          </div>
          <img
            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
            alt="Founding team"
            width={480}
            height={400}
            className="order-1 object-cover md:order-2"
          />
        </div>
      </section>
    </section>
  );
};

interface PlusSignsProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

const PlusSigns = ({ className, ...props }: PlusSignsProps) => {
  const GAP = 16;
  const STROKE_WIDTH = 1;
  const PLUS_SIZE = 6;
  const id = useId();
  const patternId = `plus-pattern-${id}`;

  return (
    <svg width={GAP * 2} height={GAP * 2} className={className} {...props}>
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={GAP}
          height={GAP}
          patternUnits="userSpaceOnUse"
        >
          <line
            x1={GAP / 2}
            y1={(GAP - PLUS_SIZE) / 2}
            x2={GAP / 2}
            y2={(GAP + PLUS_SIZE) / 2}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
          />
          <line
            x1={(GAP - PLUS_SIZE) / 2}
            y1={GAP / 2}
            x2={(GAP + PLUS_SIZE) / 2}
            y2={GAP / 2}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};

export { About8 };
