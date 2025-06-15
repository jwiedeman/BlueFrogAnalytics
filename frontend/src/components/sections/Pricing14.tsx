import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Pricing14 = () => {
  return (
    <section className="py-32">
      <div className="container">
        <div className="mx-auto max-w-5xl rounded-lg bg-muted p-6 md:p-10">
          <div className="mb-12 flex items-center gap-3">
            <span className="text-2xl font-bold">Business Launch Kit</span>
            <Badge
              variant="outline"
              className="border-green-200 bg-green-100 text-green-600"
            >
              20% off
            </Badge>
          </div>
          <div className="flex flex-col justify-between gap-6 md:flex-row">
            <h2 className="max-w-xl text-3xl font-bold md:text-4xl">
              Launch your business online with our starter package
            </h2>
            <div className="md:text-right">
              <span className="text-3xl font-bold md:text-5xl">$250</span>
              <p className="text-muted-foreground">Per month</p>
            </div>
          </div>
          <Separator className="my-8" />
          <div>
            <p className="mb-5 text-muted-foreground">
              Everything you need for a simple web presence:
            </p>
            <div className="flex flex-col justify-between gap-10 md:flex-row md:gap-20">
              <ul className="grid gap-x-20 gap-y-4 font-medium md:grid-cols-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4" />
                  Custom brochure website
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4" />
                  Lead capture form
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4" />
                  Menu display and updates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4" />
                  Domain & hosting included
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4" />
                  Ongoing SEO & analytics
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4" />
                  Monthly content edits
                </li>
              </ul>
              <div className="flex flex-col gap-4">
                <Button size="lg">Book a demo</Button>
                <Button variant="outline" size="lg">
                  Learn more
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Pricing14 };
