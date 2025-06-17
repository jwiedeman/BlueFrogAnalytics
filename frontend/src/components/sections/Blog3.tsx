import { ArrowUpRight } from "lucide-react"
import type { CollectionEntry } from "astro:content"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { randomUnsplash } from "@/lib/utils"

interface Blog3Props {
  posts: CollectionEntry<"blog">[]
}


const Blog3 = ({ posts }: Blog3Props) => {
  if (!posts.length) return null
  const [first, ...rest] = posts
  return (
    <section className="py-32">
      <div className="container">
        <div className="mb-8 md:mb-14 lg:mb-16">
          <p className="text-wider mb-4 text-sm font-medium text-muted-foreground">Eyebrow</p>
          <h1 className="mb-4 w-full text-4xl font-medium md:mb-5 md:text-5xl lg:mb-6 lg:text-6xl">Blog</h1>
          <p>{first.data.description || first.body.slice(0, 80) + "..."}</p>
        </div>
        <a href={`/blog/${first.slug}`} className="group relative mb-8 block md:mb-14 md:overflow-clip md:rounded-xl lg:mb-16">
          <div className="mb-4 aspect-4/3 overflow-clip rounded-xl md:mb-0 md:aspect-8/5 lg:rounded-2xl">
            <div className="h-full w-full transition duration-300 group-hover:scale-105">
              <img
                src={first.data.image ?? randomUnsplash()}
                alt={first.data.title}
                className="relative h-full w-full object-cover object-center"
              />
            </div>
          </div>
          <div className="flex flex-col gap-6 md:absolute md:inset-x-0 md:bottom-0 md:bg-linear-to-t md:from-primary/80 md:to-transparent md:p-8 md:pt-24 md:text-primary-foreground">
            <div>
              <div className="mb-4 md:hidden">
                <Badge>Post</Badge>
              </div>
              <div className="mb-2 flex">
                <div className="flex-1 text-lg font-medium md:text-2xl lg:text-3xl">{first.data.title}</div>
                <ArrowUpRight className="size-6" />
              </div>
              <div className="text-sm md:text-base">{first.data.description}</div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden flex-1 gap-8 md:flex lg:flex-row">
                <div className="flex flex-col">
                  <span className="mb-2 text-xs font-medium">Written by</span>
                  <div className="flex flex-1 items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp" />
                      <AvatarFallback>AU</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{first.data.author}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="mb-2 text-xs font-medium">Published on</span>
                  <div className="flex flex-1 items-center">
                    <span className="text-sm font-medium">{first.data.pubDate && new Date(first.data.pubDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a>
        <Tabs defaultValue="all">
          <div className="mb-9 flex flex-col justify-between gap-8 md:mb-14 md:flex-row lg:mb-16">
            <div className="flex-1 overflow-x-auto max-md:container max-md:-mx-[2rem] max-md:w-[calc(100%+4rem)]">
              <TabsList>
                <TabsTrigger value="all">View all</TabsTrigger>
              </TabsList>
            </div>
            <div className="shrink-0 md:w-52 lg:w-56">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-x-4 gap-y-8 md:grid-cols-2 lg:gap-x-6 lg:gap-y-12 2xl:grid-cols-3">
            {rest.slice(0,8).map((post, idx) => (
              <a key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col">
                <div className="mb-4 flex overflow-clip rounded-xl md:mb-5">
                  <div className="h-full w-full transition duration-300 group-hover:scale-105">
                    <img
                      src={post.data.image ?? randomUnsplash(600, 400)}
                      alt={post.data.title}
                      className="aspect-3/2 h-full w-full object-cover object-center"
                    />
                  </div>
                </div>
                <div className="mb-4"><Badge>Post</Badge></div>
                <div className="mb-2 line-clamp-3 text-lg font-medium break-words md:mb-3 md:text-2xl lg:text-3xl">
                  {post.data.title}
                </div>
                <div className="mb-4 line-clamp-2 text-sm text-muted-foreground md:mb-5 md:text-base">
                  {post.data.description}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="size-12">
                    <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp" />
                    <AvatarFallback>AU</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-px">
                    <span className="text-xs font-medium">{post.data.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {post.data.pubDate && new Date(post.data.pubDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div className="mt-8 border-t border-border py-2 md:mt-10 lg:mt-12">
            <Pagination>
              <PaginationContent className="w-full justify-between">
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <div className="hidden items-center gap-1 md:flex">
                  <PaginationItem>
                    <PaginationLink href="#">1</PaginationLink>
                  </PaginationItem>
                </div>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </Tabs>
      </div>
    </section>
  )
}

export { Blog3 }
