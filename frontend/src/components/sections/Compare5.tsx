import { Button } from "@/components/ui/button";

const Compare5 = () => {
  return (
    <section className="py-32">
      <div className="container">
        <div className="text-center">
          <h2 className="text-3xl font-medium sm:text-4xl md:text-5xl lg:text-6xl">
            Your Success, Two Paths
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground sm:mt-6 sm:text-xl">
            Choose the approach that fits your vision and resources.
          </p>
        </div>
        <div className="relative mt-8 grid gap-6 sm:mt-10 md:mt-12 lg:grid-cols-2 lg:gap-10 xl:gap-14">
          {/* Build for Me Card */}
          <div className="relative h-full">
            <div className="relative aspect-4/5 min-h-[400px] overflow-hidden rounded-2xl bg-accent sm:aspect-[0.9] sm:min-h-[480px] sm:rounded-3xl md:min-h-[520px]">
              <img
                src="https://shadcnblocks.com/images/block/photos/simone-hutsch-9jsQcDsxyqA-unsplash.jpg"
                alt="Build for me"
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-[40%] bg-linear-to-t from-black via-black/50 to-transparent backdrop-blur-[2px] sm:h-[45%] md:h-[50%]" />
              <div className="absolute bottom-0 w-full space-y-4 p-4 sm:p-6 lg:p-8 xl:p-10">
                <h3 className="text-xl font-semibold text-white sm:text-2xl lg:text-3xl">
                  Effortless Excellence – "Build For Me"
                </h3>
                <p className="mt-2 text-sm text-white/80 sm:text-base">
                  Let our expert team craft a polished, tailor-made solution. Experience elite-level service without lifting a finger.
                </p>
                <Button variant="outline">Start Your Journey</Button>
              </div>
            </div>
          </div>

          {/* Do it Yourself Card */}
          <div className="relative h-full">
            <div className="relative aspect-4/5 min-h-[400px] overflow-hidden rounded-2xl sm:aspect-[0.9] sm:min-h-[480px] sm:rounded-3xl md:min-h-[520px]">
              <img
                src="https://shadcnblocks.com/images/block/photos/simone-hutsch-uR__S5GX8Io-unsplash.jpg"
                alt="Do it yourself"
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-[40%] bg-linear-to-t from-black via-black/50 to-transparent backdrop-blur-[2px] sm:h-[45%] md:h-[50%]" />
              <div className="absolute bottom-0 w-full space-y-4 p-4 sm:p-6 lg:p-8 xl:p-10">
                <h3 className="text-xl font-semibold text-white sm:text-2xl lg:text-3xl">
                  Empowered Control – "Do It Yourself"
                </h3>
                <p className="mt-2 text-sm text-white/80 sm:text-base">
                  Harness our powerful platform. Build confidently at your own pace, with our experts standing by whenever you need.
                </p>
                <Button variant="outline">Take the Wheel</Button>
              </div>
            </div>
          </div>

          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-lg sm:px-6 sm:py-4 sm:text-base lg:px-8 lg:py-6">
            OR
          </span>
        </div>
      </div>
    </section>
  );
};

export { Compare5 };
