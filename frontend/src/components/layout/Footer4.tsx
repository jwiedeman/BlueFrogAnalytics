// Import icons using explicit file path to avoid ESM directory resolution issues
import { FaDiscord, FaTwitter } from "react-icons/fa/index.js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

const sections = [
  {
    title: "Product",
    links: [
      { name: "Overview", href: "/services" },
      { name: "Pricing", href: "/pricing" },
      { name: "Marketplace", href: "/integrations" },
      { name: "Features", href: "/services" },
      { name: "Integrations", href: "/integrations" },
      { name: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Team", href: "/team" },
      { name: "Blog", href: "/blog" },
      { name: "Careers", href: "/careers" },
      { name: "Contact", href: "/contact" },
      { name: "Privacy", href: "/privacy-policy" },
      { name: "Accessibility Statement", href: "/accessibility-statement" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Help", href: "/help-center" },
      { name: "Sales", href: "/request-a-quote" },
      { name: "Advertise", href: "/partners" },
    ],
  },
  {
    title: "Promotions",
    links: [
      { name: "Birthday", href: "/birthday" },
      { name: "Educator", href: "/educator" },
      { name: "Medical Professionals", href: "/medical-professionals" },
      { name: "Military/Veterans", href: "/military-veterans" },
      { name: "New Business", href: "/new-business" },
    ],
  },
]

interface Footer4Props {
  logo?: {
    url: string
    src: string
    alt: string
    title: string
  }
}
const Footer4 = ({
  logo = {
    url: "https://www.shadcnblocks.com",
    src: "https://shadcnblocks.com/images/block/logos/shadcnblockscom-icon.svg",
    alt: "logo",
    title: "BlueFrogAnalytics",
  },
}: Footer4Props) => {
  return (
    <section className="py-32">
      <div className="container">
        <footer>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
            <div className="col-span-2 flex h-full items-center justify-between md:items-start lg:col-span-2 lg:flex-col">
              <div className="flex items-center gap-2 lg:justify-start">
                <a href={logo.url}>
                  <img src={logo.src} alt={logo.alt} title={logo.title} className="h-8" />
                </a>
                <h2 className="text-lg font-semibold">{logo.title}</h2>
              </div>
              <ul className="flex items-center space-x-6 text-muted-foreground">
                <li className="font-medium hover:text-primary">
                  <a href="#">
                    <FaDiscord className="size-6" />
                  </a>
                </li>
                <li className="font-medium hover:text-primary">
                  <a href="#">
                    <FaTwitter className="size-6" />
                  </a>
                </li>
              </ul>
            </div>
            <Separator className="col-span-2 my-6 lg:hidden" />
            {sections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="mb-4 font-bold">{section.title}</h3>
                <ul className="space-y-4 text-muted-foreground">
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx} className="font-medium hover:text-primary">
                      <a href={link.href}>{link.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator className="my-14 lg:my-20" />
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="mb-2 text-3xl font-semibold lg:text-4xl">Join our newsletter</p>
              <p className="text-muted-foreground">Get exclusive news, features, and updates.</p>
            </div>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input type="email" placeholder="Email" />
              <Button type="submit">Subscribe</Button>
            </div>
          </div>
          <Separator className="my-14 lg:my-20" />
          <div className="flex flex-col justify-between gap-4 text-sm font-medium text-muted-foreground md:flex-row md:items-center">
            <ul className="flex gap-4">
              <li className="underline hover:text-primary">
                <a href="/terms"> Terms and Conditions</a>
              </li>
              <li className="underline hover:text-primary">
                <a href="/privacy-policy"> Privacy Policy</a>
              </li>
              <li className="underline hover:text-primary">
                <a href="/accessibility-statement"> Accessibility Statement</a>
              </li>
            </ul>
            <p>
              © 2024 <span className="bluefrog-brand">BlueFrog</span>Analytics.
              All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </section>
  )
}

export { Footer4 }
