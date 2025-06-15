import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Contact1 = () => {
  return (
    <section className="relative py-32">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 -bottom-20 bg-[radial-gradient(ellipse_35%_15%_at_40%_55%,hsl(var(--accent))_0%,transparent_100%)] lg:bg-[radial-gradient(ellipse_12%_20%_at_60%_45%,hsl(var(--accent))_0%,transparent_100%)]"></div>
      <div className="pointer-events-none absolute inset-x-0 -top-20 -bottom-20 bg-[radial-gradient(ellipse_35%_20%_at_70%_75%,hsl(var(--accent))_0%,transparent_80%)] lg:bg-[radial-gradient(ellipse_15%_30%_at_70%_65%,hsl(var(--accent))_0%,transparent_80%)]"></div>
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 -bottom-20 bg-[radial-gradient(hsl(var(--accent-foreground)/0.1)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_60%_at_65%_50%,#000_0%,transparent_80%)] [background-size:8px_8px]"></div>
      <div className="container grid w-full grid-cols-1 gap-x-32 overflow-hidden lg:grid-cols-2">
        <div className="w-full pb-10 md:space-y-10 md:pb-0">
          <div className="space-y-4 md:max-w-[40rem]">
            <h1 className="text-4xl font-medium lg:text-5xl">
              Jump into the Pond! 🐸
            </h1>
            <div className="text-muted-foreground md:text-base lg:text-lg lg:leading-7">
              Curious about making your analytics leap ahead? Fill in the details below, and our friendly frogs will get back to you in a splash!
            </div>
          </div>
          <div className="hidden md:block">
            <div className="space-y-16 pb-20 lg:pb-0">
              <div className="space-y-6">
                <div className="mt-16 flex overflow-hidden"></div>
                <div className="space-y-4">
                  <p className="text-sm font-semibold">What you can expect:</p>
                  <div className="flex items-center space-x-2.5">
                    <Check className="size-5 shrink-0 text-muted-foreground" />
                    <p className="text-sm">
                      Detailed product presentation tailored to you
                    </p>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Check className="size-5 shrink-0 text-muted-foreground" />
                    <p className="text-sm">
                      Consulting on your messaging strategy
                    </p>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Check className="size-5 shrink-0 text-muted-foreground" />
                    <p className="text-sm">
                      Answers to all the questions you have
                    </p>
                  </div>
                </div>
              </div>
              <div></div>
            </div>
          </div>
        </div>
        <div className="flex w-full justify-center lg:mt-2.5">
          <div className="relative flex w-full max-w-[30rem] min-w-[20rem] flex-col items-center overflow-visible md:min-w-[24rem]">
            <form className="z-10 space-y-6">
              <div className="w-full space-y-6 rounded-xl border border-border bg-background px-6 py-10 shadow-sm">
                <div>
                  <div className="mb-2.5 text-sm font-medium">
                    <label htmlFor="fullName">Full Name</label>
                  </div>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Joe Average, Frog Enthusiast"
                  />
                </div>
                <div>
                  <div className="mb-2.5 text-sm font-medium">
                    <label htmlFor="company">Company Name</label>
                  </div>
                  <Input id="company" name="company" placeholder="Acme Corp or Pond Inc." />
                </div>
                <div>
                  <div className="mb-2.5 text-sm font-medium">
                    <label htmlFor="phone">Phone Number</label>
                  </div>
                  <Input id="phone" name="phone" placeholder="+1 234 567 8901" />
                </div>
                <div>
                  <div className="mb-2.5 text-sm font-medium">
                    <label htmlFor="email">Business Email</label>
                  </div>
                  <Input
                    id="email"
                    name="email"
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <div className="mb-2.5 text-sm font-medium">
                    <label htmlFor="country">Country</label>
                  </div>
                  <Select>
                    <SelectTrigger id="country" name="country">
                      <SelectValue placeholder="Where's your lily pad?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aus">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="mb-2.5 text-sm font-medium">
                    <label htmlFor="companySize">Company Size</label>
                  </div>
                  <Select>
                    <SelectTrigger id="companySize" name="companySize">
                      <SelectValue placeholder="Tadpole or Bullfrog?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10</SelectItem>
                      <SelectItem value="11-50">11-50</SelectItem>
                      <SelectItem value="51-200">51-200</SelectItem>
                      <SelectItem value="200+">200+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="mb-2.5 text-sm font-medium">
                    <label htmlFor="id">
                      How did you hear about us? <span className="text-muted-foreground">(Who told you the pond was cool?)</span>
                    </label>
                  </div>
                  <Select>
                    <SelectTrigger id="referral" name="referral">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="search">Web Search</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-full flex-col justify-end space-y-3 pt-2">
                  <Button type="submit">Reach Out</Button>
                  <div className="text-xs text-muted-foreground">
                    Rest assured, we keep your data safely in our pond. For more about how we handle your info, see our{' '}
                    <a href="#" className="underline">Privacy Policy</a>.
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Contact1 };

