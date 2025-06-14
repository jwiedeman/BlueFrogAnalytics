import { ArrowRight } from "lucide-react"

import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface DataItem {
  title: string
  content: string
}

const DATA: DataItem[] = [
  {
    title: "Cloud Computing",
    content:
      "Exploring cost-effective cloud migration patterns and multi-cloud management",
  },
  {
    title: "Cybersecurity",
    content:
      "Implementing adaptive security frameworks for distributed workforces",
  },
  {
    title: "IoT",
    content: "Reducing latency in smart city deployments through fog computing",
  },
  {
    title: "Blockchain",
    content:
      "Enterprise applications of distributed ledger technology in supply chains",
  },
];

const Blog22 = () => {
  return (
    <section className="dark relative bg-background py-32">
      <div className="container">
        {/* Title Section - Updated layout */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Tech Insights
          </h1>

          <div className="mt-4 flex justify-start">
            <span className="mt-2 block text-sm text-muted-foreground md:text-base">
              Exploring cutting-edge technologies shaping tomorrow's digital
              landscape
            </span>
            <Button
              variant="outline"
              className="ml-auto rounded-full border-foreground text-foreground"
            >
              Read More
              <ArrowRight className="h-4 w-4 md:h-6 md:w-6" />
            </Button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {/* Main Featured Post */}
          <div className="mb-4">
            <img
              className="w-full rounded-lg object-cover"
              src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-8-wide.svg"
              alt="AI Revolution"
            />
            <div className="mt-4">
              <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
                Next-Gen AI: Transforming Business Operations
              </h1>
            </div>
            <div className="mt-6 flex items-center gap-3 md:mt-8 md:gap-4">
              <Avatar className="h-8 w-8 rounded-md md:h-12 md:w-12">
                <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp" />
              </Avatar>
              <span className="text-sm md:text-base">
                <span className="block text-foreground">Sarah Johnson</span>
                <span className="text-xs text-muted-foreground md:text-sm">
                  AI Researcher
                </span>
              </span>
            </div>
          </div>

          {/* Secondary Posts List */}
          <div className="space-y-6 text-foreground md:space-y-8">
            {DATA.map((post, index) => (
              <div
                key={index}
                className="flex items-start gap-4 border-b pb-6 last:border-b-0"
              >
                <div className="w-1/4 shrink-0 md:w-1/5">
                  <img
                    className="rounded-md"
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-8-wide.svg"
                    alt={post.title}
                  />
                </div>
                <div className="w-3/4 md:w-4/5">
                  <p className="text-sm leading-relaxed md:text-base">
                    {post.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export { Blog22 }
