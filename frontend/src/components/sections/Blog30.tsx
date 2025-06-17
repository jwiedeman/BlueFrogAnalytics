import { ArrowRightIcon } from "lucide-react"
import React from "react"
import type { CollectionEntry } from "astro:content"

import { cn, randomUnsplash } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Blog30Props {
  posts: CollectionEntry<"blog">[]
}


const Blog30 = ({ posts }: Blog30Props) => {
  return (
    <section className="bg-background py-32">
      <div className="container">
        <h1 className="mb-12 max-w-lg font-sans text-5xl font-extrabold tracking-tight text-foreground md:text-7xl">
          Discover Our Fresh Content
        </h1>

        <div className="flex flex-col">
          {posts.slice(0, 3).map((post, index) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex flex-col items-center gap-16 md:flex-row"
            >
              <div className="flex h-80 w-full items-center justify-center overflow-hidden rounded-3xl bg-muted md:w-140">
                <img
                  src={post.data.image ?? randomUnsplash()}
                  className="h-full w-full object-cover"
                  alt={post.data.title}
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
                        {post.data.title}
                      </h2>
                      <p className="mt-2 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
                        {post.data.pubDate ? new Date(post.data.pubDate).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <div className="flex h-full w-full flex-col items-start justify-between gap-6">
                      <p className="text-lg leading-relaxed font-normal tracking-tight text-muted-foreground md:text-xl">
                        {post.data.description}
                      </p>
                      <span
                        className="inline-flex items-center justify-center gap-4 px-0 text-primary transition-all ease-in-out group-hover:gap-6"
                      >
                        Read
                        <ArrowRightIcon />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Blog30 }
