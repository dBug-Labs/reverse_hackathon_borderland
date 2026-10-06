import type { Metadata } from 'next';
import { CodeReview } from '@/components/codeReview/CodeReview';

export const metadata: Metadata = {
  title: 'Code review',
  robots: { index: false, follow: false },
};

/** /code-review — the post-freeze code review kit. Password protected; prompts load only after login. */
export default function CodeReviewPage() {
  return <CodeReview />;
}
