import { CircleArrowRight, Files, Settings } from "lucide-react";

interface About1Props {
  heading: string;
  description: string;
  mission: string;
  subheading: string;
  subDescription: string;
  bullets: string[];
  closingHeading: string;
  closingText: string;
}

const icons = [Files, CircleArrowRight, Settings];

const About1 = ({
  heading,
  description,
  mission,
  subheading,
  subDescription,
  bullets,
  closingHeading,
  closingText,
}: About1Props) => {
  return (
    <section className="py-32">
      <div className="container flex flex-col gap-28">
        <div className="flex flex-col gap-7">
          <h1 className="text-4xl font-semibold lg:text-7xl">{heading}</h1>
          <p className="max-w-xl text-lg">{description}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <img
            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
            alt="placeholder"
            className="size-full max-h-96 rounded-2xl object-cover"
          />
          <div className="flex flex-col justify-between gap-10 rounded-2xl bg-muted p-10">
            <p className="text-sm text-muted-foreground">OUR MISSION</p>
            <p className="text-lg font-medium">{mission}</p>
          </div>
        </div>
        <div className="flex flex-col gap-6 md:gap-20">
          <div className="max-w-xl">
            <h2 className="mb-2.5 text-3xl font-semibold md:text-5xl">{subheading}</h2>
            <p className="text-muted-foreground">{subDescription}</p>
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            {bullets.map((item, idx) => {
              const Icon = icons[idx % icons.length];
              return (
                <div key={idx} className="flex flex-col">
                  <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-accent">
                    <Icon className="size-5" />
                  </div>
                  <p className="text-muted-foreground">{item}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="mb-10 text-sm font-medium text-muted-foreground">JOIN OUR TEAM</p>
            <h2 className="mb-2.5 text-3xl font-semibold md:text-5xl">{closingHeading}</h2>
          </div>
          <div>
            <img
              src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
              alt="placeholder"
              className="mb-6 max-h-36 w-full rounded-xl object-cover"
            />
            <p className="text-muted-foreground">{closingText}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export { About1 };
