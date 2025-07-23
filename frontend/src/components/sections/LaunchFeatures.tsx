import { Check } from "lucide-react"

const features = [
  "Trusted by Businesses Nationwide",
  "Fast, Responsive, SEO-Optimized",
  "Expertly Maintained & Secure",
  "Always Up-to-date, Always Fast",
]

const LaunchFeatures = () => {
  return (
    <section className="py-16">
      <div className="container">
        <h2 className="mb-6 text-center text-3xl font-semibold">Why Choose Us</h2>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="size-5 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export { LaunchFeatures }
