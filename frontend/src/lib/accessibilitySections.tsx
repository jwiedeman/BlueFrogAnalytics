import { Fragment, ReactNode } from 'react';

interface Section {
  id: string;
  heading: string;
  content: ReactNode;
}

export const accessibilitySections: Section[] = [
  {
    id: 'overview',
    heading: 'Overview',
    content: (
      <Fragment>
        <p>
          At Blue Frog Analytics, we are deeply committed to ensuring digital accessibility for everyone, including those with disabilities. Our dedication is rooted in our belief that the web should be an inclusive and universally accessible environment.
        </p>
        <p>
          We strive to meet and exceed compliance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards and continually incorporate innovative practices.
        </p>
      </Fragment>
    ),
  },
  {
    id: 'measures',
    heading: 'Accessibility Measures',
    content: (
      <ul>
        <li>
          <strong>Comprehensive WCAG Testing:</strong> Regular audits and evaluations to ensure alignment with WCAG 2.1 Level AA guidelines.
        </li>
        <li>
          <strong>Innovative Custom Testing:</strong> Unique testing methodologies like our proprietary "Tabchain Visualization Test" that simulates screen reader behavior to visualize navigation flow.
        </li>
        <li>
          <strong>Continuous Improvement:</strong> Ongoing updates driven by user feedback, accessibility research, and technological advancements.
        </li>
      </ul>
    ),
  },
  {
    id: 'feedback',
    heading: 'Feedback and Assistance',
    content: (
      <Fragment>
        <p>
          We welcome your feedback on the accessibility of Blue Frog Analytics. If you experience issues or need assistance, please <a href="/contact">contact us</a>. We strive to respond promptly and resolve concerns.
        </p>
        <p>Thank you for helping make the web accessible to all.</p>
      </Fragment>
    ),
  },
];
