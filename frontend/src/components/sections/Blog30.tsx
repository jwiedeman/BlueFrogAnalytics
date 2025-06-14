import { ArrowRightIcon } from "lucide-react"
import React from "react"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const blogPosts = [
  {
    id: 1,
    title: "The Future of Web Development",
    date: "3rd Dec 2024",
    description:
      "Exploring the latest trends in frontend and backend technologies, including AI-powered coding tools and modern frameworks.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/nubelson-fernandes-tAJYoec13xk-unsplash.jpg",
    imageAlt: "Developer working on code",
    href: "#",
  },
  {
    id: 2,
    title: "Mastering React Performance Optimization",
    date: "5th Dec 2024",
    description:
      "A deep dive into memoization, lazy loading, and efficient state management techniques for faster React applications.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/jason-goodman-ZJlfUi5rTDU-unsplash.jpg",
    imageAlt: "Code on screen",
    href: "#",
  },
  {
    id: 3,
    title: "UI/UX Design Principles for 2025",
    date: "10th Dec 2024",
    description:
      "Key strategies for creating intuitive, beautiful interfaces that delight users and drive engagement in the coming year.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/studio-republic-fotKKqWNMQ4-unsplash.jpg",
    imageAlt: "UI/UX design sketches on paper",
    href: "#",
  },
];

const Blog30 = () => {
  return (
    <section className="bg-background py-32">
      <div className="container">
        <h1 className="mb-12 max-w-lg font-sans text-5xl font-extrabold tracking-tight text-foreground md:text-7xl">
          Discover Our Fresh Content
        </h1>

        <div className="flex flex-col">
          {blogPosts.map((post, index) => (
            <div
              key={post.id}
              className="flex flex-col items-center gap-16 md:flex-row"
            >
              <div className="flex h-80 w-full items-center justify-center overflow-hidden rounded-3xl bg-muted md:w-140">
                <img
                  src={post.image}
                  className="h-full w-full object-cover"
                  alt={post.imageAlt}
                />
              </div>
              <Card className="border-none shadow-none">
                <CardContent className="p-0">
                  <div
                    className={cn(
                      "mb-5 flex h-90 items-start border-b py-10 md:mb-0 lg:gap-32",
                      index == 0 && "md:border-t",
                    )}
                  >
                    <div className="flex h-full w-full flex-col items-start justify-between pr-8">
                      <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                        {post.title}
                      </h2>
                      <p className="mt-2 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
                        {post.date}
                      </p>
                    </div>
                    <div className="flex h-full w-full flex-col items-start justify-between gap-6">
                      <p className="text-lg leading-relaxed font-normal tracking-tight text-muted-foreground md:text-xl">
                        {post.description}
                      </p>
                      <Button
                        variant="ghost"
                        className="inline-flex items-center justify-center gap-4 px-0 text-primary transition-all ease-in-out hover:gap-6 hover:text-accent-foreground"
                      >
                        <a
                          href={post.href}
                          className="text-lg font-semibold tracking-tight"
                        >
                          Read
                        </a>
                        <ArrowRightIcon />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Blog30 }
