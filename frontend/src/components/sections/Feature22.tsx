import { Check, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const Feature22 = () => {
  return (
    <section className="py-16 sm:py-24 md:py-32">
      <div className="container">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-8 md:gap-12 lg:grid-cols-3 lg:gap-16">
          <h2 className="mb-4 text-3xl font-medium sm:col-span-2 sm:text-4xl md:mb-0 lg:col-span-1">
            Build any kind of Website with our Blocks
          </h2>
          <ul className="flex flex-col gap-3 text-muted-foreground sm:gap-4">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> Responsive Design and Layout
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> Clean and Modern Design
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> Easy to Customize
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> Cross Browser Compatible
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> SEO Friendly
            </li>
          </ul>
          <ul className="flex flex-col gap-4 text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> High Performance and Speed
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> Clean Code and Well Documented
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> Fast Loading and Free Updates
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> 24/7 Support
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> Lifetime Access and Updates
            </li>
          </ul>
        </div>
        <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6 md:mt-20 md:gap-8 lg:grid-cols-3">
          <div className="rounded-lg border">
            <div className="relative p-1">
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                alt="placeholder"
                className="max-h-96 w-full rounded-t-lg object-cover sm:max-h-72 md:max-h-64"
              />
              <Badge
                variant="outline"
                className="absolute top-5 left-5 bg-primary-foreground"
              >
                Example
              </Badge>
            </div>
            <div>
              <div className="mb-3 px-4 pt-5 sm:px-5 md:px-6 md:pt-6">
                <h3 className="font-medium">Copy and paste Blocks</h3>
                <p className="text-muted-foreground">
                  Easly copy and paste any block you like and use it in your project.
                </p>
              </div>
              <div className="h-px border-t border-dashed"></div>
              <ul className="text-muted-foreground">
                <li className="flex items-start gap-2 px-4 py-3 sm:px-5 md:px-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  Responsive design and layout with clean and modern design
                </li>
                <div className="h-px border-t border-dashed"></div>
                <li className="flex items-start gap-2 px-4 py-3 sm:px-5 md:px-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  Easy to customize with cross browser compatibility
                </li>
                <div className="h-px border-t border-dashed"></div>
                <li className="flex items-start gap-2 px-4 py-3 sm:px-5 md:px-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  SEO friendly with high performance and speed for improved laod times
                </li>
              </ul>
              <div className="h-px border-t border-dashed"></div>
              <a
                href="#"
                className="my-3 flex items-center gap-2 px-4 font-medium sm:my-4 sm:px-5 md:px-6"
              >
                Read more
                <ChevronRight className="mt-0.5 size-4" />
              </a>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="relative p-1">
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-2.svg"
                alt="placeholder"
                className="max-h-96 w-full rounded-t-lg object-cover sm:max-h-72 md:max-h-64"
              />
              <Badge
                variant="outline"
                className="absolute top-5 left-5 bg-primary-foreground"
              >
                Example
              </Badge>
            </div>
            <div>
              <div className="mb-3 px-4 pt-5 sm:px-5 md:px-6 md:pt-6">
                <h3 className="font-medium">Easy to Customize Blocks</h3>
                <p className="text-muted-foreground">
                  Easly customize any block you like and use it in your project.
                </p>
              </div>
              <div className="h-px border-t border-dashed"></div>
              <ul className="text-muted-foreground">
                <li className="flex items-start gap-2 px-4 py-3 sm:px-5 md:px-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  The blocks are clean and modern with easy to customize features
                </li>
                <div className="h-px border-t border-dashed"></div>
                <li className="flex items-start gap-2 px-4 py-3 sm:px-5 md:px-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  All blocks are SEO friendly with cross browser compatibility
                </li>
                <div className="h-px border-t border-dashed"></div>
                <li className="flex items-start gap-2 px-4 py-3 sm:px-5 md:px-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  Each block is responsive with high performance and speed
                </li>
              </ul>
              <div className="h-px border-t border-dashed"></div>
              <a
                href="#"
                className="my-3 flex items-center gap-2 px-4 font-medium sm:my-4 sm:px-5 md:px-6"
              >
                Read more
                <ChevronRight className="mt-0.5 size-4" />
              </a>
            </div>
          </div>
          <div className="rounded-lg border">
            <div className="relative p-1">
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-3.svg"
                alt="placeholder"
                className="max-h-96 w-full rounded-t-lg object-cover sm:max-h-72 md:max-h-64"
              />
              <Badge
                variant="outline"
                className="absolute top-5 left-5 bg-primary-foreground"
              >
                Example
              </Badge>
            </div>
            <div>
              <div className="mb-3 px-4 pt-5 sm:px-5 md:px-6 md:pt-6">
                <h3 className="font-medium">Readymade Blocks for you to use</h3>
                <p className="text-muted-foreground">
                  Easly use any block you like and use it in your project.
                </p>
              </div>
              <div className="h-px border-t border-dashed"></div>
              <ul className="text-muted-foreground">
                <li className="flex items-start gap-2 px-4 py-3 sm:px-5 md:px-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  Prebuilt blocks built with shadcn/ui & TailwindCSS
                </li>
                <div className="h-px border-t border-dashed"></div>
                <li className="flex items-start gap-2 px-4 py-3 sm:px-5 md:px-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  Synced with your project theme and design with easy to customize features
                </li>
                <div className="h-px border-t border-dashed"></div>
                <li className="flex items-start gap-2 px-4 py-3 sm:px-5 md:px-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  Various blocks to choose from with high performance and speed
                </li>
              </ul>
              <div className="h-px border-t border-dashed"></div>
              <a
                href="#"
                className="my-3 flex items-center gap-2 px-4 font-medium sm:my-4 sm:px-5 md:px-6"
              >
                Read more
                <ChevronRight className="mt-0.5 size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Feature22 }
