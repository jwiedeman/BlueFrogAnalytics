import { Globe } from "lucide-react";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const Hero53 = () => {
  return (
    <section className="relative py-32">
      <div className="container px-4 sm:px-6 md:px-8">
        <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(var(--muted-foreground)_1px,transparent_1px)] [background-size:14px_14px] opacity-35"></div>
        <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl xl:text-8xl">
          Your SMB's Secret Key to Growth
        </h1>
        <div className="mt-10 flex flex-col-reverse gap-8 md:mt-12 md:flex-row md:items-center md:gap-10 lg:mt-14">
          <div className="flex flex-col gap-6">
            <Button className="px-6 py-5 bg-blue-600 hover:bg-blue-700 text-white sm:w-fit">
              Start Free Scan <Globe className="size-4 ml-2" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center -space-x-1.5">
                <Avatar className="size-7 border">
                  <AvatarImage
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp"
                    alt="User testimonial avatar"
                  />
                </Avatar>
                <Avatar className="size-7 border">
                  <AvatarImage
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-6.webp"
                    alt="User testimonial avatar"
                  />
                </Avatar>
                <Avatar className="size-7 border">
                  <AvatarImage
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp"
                    alt="User testimonial avatar"
                  />
                </Avatar>
              </span>
              <p className="text-sm text-muted-foreground">
                Trusted by 3,000+ SMBs and Agencies
              </p>
            </div>
          </div>
          <p className="max-w-lg text-xl leading-relaxed text-muted-foreground">
            Targeted leads, unified dashboards and hands-on website expertise.
            Browse our free docs or request a full audit—no CTO required.
          </p>
        </div>
      </div>
    </section>
  );
};

export { Hero53 };
