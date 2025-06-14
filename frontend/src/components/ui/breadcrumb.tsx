import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav className={cn("w-full", className)} aria-label="breadcrumb" {...props} />
}
Breadcrumb.displayName = "Breadcrumb"

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol className={cn("flex items-center gap-1", className)} {...props} />
}
BreadcrumbList.displayName = "BreadcrumbList"

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("inline-flex items-center gap-1", className)} {...props} />
}
BreadcrumbItem.displayName = "BreadcrumbItem"

interface BreadcrumbLinkProps extends React.ComponentProps<"a"> {
  asChild?: boolean
}
function BreadcrumbLink({ className, asChild = false, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot : "a"
  return <Comp className={cn("text-sm font-medium transition-colors hover:underline", className)} {...props} />
}
BreadcrumbLink.displayName = "BreadcrumbLink"

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("font-semibold text-sm", className)} {...props} />
}
BreadcrumbPage.displayName = "BreadcrumbPage"

function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li role="presentation" aria-hidden className={cn("select-none opacity-50", className)} {...props}>
      <ChevronRight className="h-3 w-3" />
    </li>
  )
}
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator }
