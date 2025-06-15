import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  "Access to real-time local leads",
  "Website health dashboard",
  "NAP monitoring",
  "Menu sync across platforms",
  "Priority support",
];

const Pricing15 = () => {
  return (
    <section className="py-32">
      <div className="container">
        <div className="flex flex-col gap-10 md:flex-row">
          <div className="w-auto md:w-1/2 lg:w-2/3">
            <h2 className="mb-4 text-4xl font-bold text-balance md:text-5xl">
              Leads & Monitoring Plan
            </h2>
            <p className="mb-4 text-lg text-muted-foreground">
              Get full access to local leads and keep your site healthy with our continuous monitoring tools.
            </p>
            <Button variant="default" size="lg">
              Subscribe
            </Button>
          </div>
          <div className="w-auth rounded-md border bg-muted p-11 md:w-1/2 lg:w-1/3">
            <p className="text-5xl font-bold">
              $100<span className="text-lg">/mo</span>
            </p>
            <ul className="space-y-4 pt-5 font-medium">
              {features.map((feature, index) => (
                <li key={index} className="flex">
                  <Check className="mr-2" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Pricing15 };
