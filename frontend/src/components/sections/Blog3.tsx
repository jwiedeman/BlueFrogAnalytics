import { ArrowUpRight } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const posts = [
  {
    id: "post-1",
    title: "Duis sem sem, gravida vel porttitor eu, volutpat ut arcu",
    summary:
      "Pellentesque eget quam ligula. Sed felis ante, consequat nec ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim sollicitudin hendrerit.",
    label: "Ut varius dolor turpis",
    author: "Jane Doe",
    published: "1 Jan 2024",
    href: "#",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
  {
    id: "post-2",
    title: "Duis sem sem, gravida vel porttitor eu, volutpat ut arcu",
    summary:
      "Pellentesque eget quam ligula. Sed felis ante, consequat nec ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim sollicitudin hendrerit.",
    label: "Ut varius dolor turpis",
    author: "Jane Doe",
    published: "1 Jan 2024",
    href: "#",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
  {
    id: "post-3",
    title: "Duis sem sem, gravida vel porttitor eu, volutpat ut arcu",
    summary:
      "Pellentesque eget quam ligula. Sed felis ante, consequat nec ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim sollicitudin hendrerit.",
    label: "Ut varius dolor turpis",
    author: "Jane Doe",
    published: "1 Jan 2024",
    href: "#",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
  {
    id: "post-4",
    title: "Duis sem sem, gravida vel porttitor eu, volutpat ut arcu",
    summary:
      "Pellentesque eget quam ligula. Sed felis ante, consequat nec ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim sollicitudin hendrerit.",
    label: "Ut varius dolor turpis",
    author: "Jane Doe",
    published: "1 Jan 2024",
    href: "#",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
  {
    id: "post-5",
    title: "Duis sem sem, gravida vel porttitor eu, volutpat ut arcu",
    summary:
      "Pellentesque eget quam ligula. Sed felis ante, consequat nec ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim sollicitudin hendrerit.",
    label: "Ut varius dolor turpis",
    author: "Jane Doe",
    published: "1 Jan 2024",
    href: "#",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
  {
    id: "post-6",
    title: "Duis sem sem, gravida vel porttitor eu, volutpat ut arcu",
    summary:
      "Pellentesque eget quam ligula. Sed felis ante, consequat nec ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim sollicitudin hendrerit.",
    label: "Ut varius dolor turpis",
    author: "Jane Doe",
    published: "1 Jan 2024",
    href: "#",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
  {
    id: "post-7",
    title: "Duis sem sem, gravida vel porttitor eu, volutpat ut arcu",
    summary:
      "Pellentesque eget quam ligula. Sed felis ante, consequat nec ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim sollicitudin hendrerit.",
    label: "Ut varius dolor turpis",
    author: "Jane Doe",
    published: "1 Jan 2024",
    href: "#",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
  {
    id: "post-8",
    title: "Duis sem sem, gravida vel porttitor eu, volutpat ut arcu",
    summary:
      "Pellentesque eget quam ligula. Sed felis ante, consequat nec ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim sollicitudin hendrerit.",
    label: "Ut varius dolor turpis",
    author: "Jane Doe",
    published: "1 Jan 2024",
    href: "#",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
  {
    id: "post-9",
    title: "Duis sem sem, gravida vel porttitor eu, volutpat ut arcu",
    summary:
      "Pellentesque eget quam ligula. Sed felis ante, consequat nec ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim sollicitudin hendrerit.",
    label: "Ut varius dolor turpis",
    author: "Jane Doe",
    published: "1 Jan 2024",
    href: "#",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-dark-1.svg",
  },
];

const Blog3 = () => {
  return (
    <section className="py-32">
      <div className="container">
        <div className="mb-8 md:mb-14 lg:mb-16">
          <p className="text-wider mb-4 text-sm font-medium text-muted-foreground">
            Eyebrow
          </p>
          <h1 className="mb-4 w-full text-4xl font-medium md:mb-5 md:text-5xl lg:mb-6 lg:text-6xl">
            Blog
          </h1>
          <p>Duis sem sem, gravida vel porttitor eu, volutpat ut arcu</p>
        </div>
        <a
          href="#"
          className="group relative mb-8 block md:mb-14 md:overflow-clip md:rounded-xl lg:mb-16"
        >
          <div className="mb-4 aspect-4/3 overflow-clip rounded-xl md:mb-0 md:aspect-8/5 lg:rounded-2xl">
            <div className="h-full w-full transition duration-300 group-hover:scale-105">
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                alt="placeholder"
                className="relative h-full w-full object-cover object-center"
              />
            </div>
          </div>
          <div className="flex flex-col gap-6 md:absolute md:inset-x-0 md:bottom-0 md:bg-linear-to-t md:from-primary/80 md:to-transparent md:p-8 md:pt-24 md:text-primary-foreground">
            <div>
              <div className="mb-4 md:hidden">
                <Badge>Design</Badge>
              </div>
              <div className="mb-2 flex">
                <div className="flex-1 text-lg font-medium md:text-2xl lg:text-3xl">
                  Duis sem sem, gravida vel porttitor eu, volutpat ut arcu
                </div>
                <ArrowUpRight className="size-6" />
              </div>
              <div className="text-sm md:text-base">
                Pellentesque eget quam ligula. Sed felis ante, consequat nec
                ultrices ut, ornare quis metus. Vivamus sit amet tortor vel enim
                sollicitudin hendrerit.
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden flex-1 gap-8 md:flex lg:flex-row">
                <div className="flex flex-col">
                  <span className="mb-2 text-xs font-medium">Written by</span>
                  <div className="flex flex-1 items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">Jane Doe</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="mb-2 text-xs font-medium">Published on</span>
                  <div className="flex flex-1 items-center">
                    <span className="text-sm font-medium">1 Jan 2024</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:hidden">
                <Avatar className="size-12">
                  <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-px">
                  <span className="text-xs font-medium">Jane Doe</span>
                  <span className="text-xs text-muted-foreground">1 Jan 2024</span>
                </div>
              </div>
              <div className="hidden flex-col md:flex">
                <span className="mb-2 text-xs font-medium">File under</span>
                <div className="flex flex-1 items-center gap-2">
                  <Badge>Design</Badge>
                  <Badge>Research</Badge>
                  <Badge>Presentation</Badge>
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
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="product">Product</TabsTrigger>
                <TabsTrigger value="softwareEngineering">
                  Software Engineering
                </TabsTrigger>
                <TabsTrigger value="customerSuccess">
                  Customer Success
                </TabsTrigger>
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
            {posts.map((post) => (
              <a key={post.id} href={post.href} className="group flex flex-col">
                <div className="mb-4 flex overflow-clip rounded-xl md:mb-5">
                  <div className="h-full w-full transition duration-300 group-hover:scale-105">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="aspect-3/2 h-full w-full object-cover object-center"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <Badge>{post.label}</Badge>
                </div>
                <div className="mb-2 line-clamp-3 text-lg font-medium break-words md:mb-3 md:text-2xl lg:text-3xl">
                  {post.title}
                </div>
                <div className="mb-4 line-clamp-2 text-sm text-muted-foreground md:mb-5 md:text-base">
                  {post.summary}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="size-12">
                    <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-px">
                    <span className="text-xs font-medium">{post.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {post.published}
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
                  <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
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
