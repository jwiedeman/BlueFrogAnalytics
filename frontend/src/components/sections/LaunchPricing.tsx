import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const features = [
  "Modern and optimized brochure website",
  "SEO & analytics included",
  "NAP and menu monitoring for accuracy",
  "Reliable monthly refinements",
]

const LaunchPricing = () => {
  return (
    <section className="py-16">
      <div className="container">
        <div className="mx-auto max-w-4xl rounded-lg border p-6 md:p-10">
          <h2 className="mb-2 text-center text-3xl font-semibold">Business Launch Kit</h2>
          <p className="mb-6 text-center text-muted-foreground">
            We handle the technical work so you can focus on success.
          </p>
          <ul className="mb-8 grid gap-3 sm:grid-cols-2">
            {features.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Separator className="mb-8" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center rounded-md border bg-muted/50 p-6 text-center">
              <h3 className="mb-2 text-xl font-semibold">Complete Package</h3>
              <p className="mb-4 text-muted-foreground">
                Unlimited updates, free domain and lead dashboard access.
              </p>
              <p className="mb-6 text-4xl font-bold">
                $100<span className="text-lg font-medium">/month</span>
              </p>
              <Button size="lg">Get Started</Button>
            </div>
            <div className="flex flex-col items-center rounded-md border p-6 text-center">
              <h3 className="mb-2 text-xl font-semibold">Budget Option</h3>
              <p className="mb-4 text-muted-foreground">
                Keeps hosting and analytics running with limited updates.
              </p>
              <p className="mb-6 text-4xl font-bold">
                $25<span className="text-lg font-medium">/month</span>
              </p>
              <Button variant="outline" size="lg">
                Choose Plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { LaunchPricing }
