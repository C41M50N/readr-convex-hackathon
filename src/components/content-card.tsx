import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Link } from '@tanstack/react-router';
import { type Doc } from 'convex/_generated/dataModel';

type ContentCardProps = {
  content: Doc<'contents'>
};

export function ContentCard({ content }: ContentCardProps) {
  if (content.type === 'article' && content.metadata) {
    return (
      <Card className="border rounded p-4 shadow-sm">
        <CardHeader>
          <CardTitle>{content.metadata.title}</CardTitle>
          <CardDescription>{content.metadata.author || 'Unknown Author'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={`/content/${content._id}`} className="text-blue-500 underline">
            {content.url}
          </Link>
        </CardContent>
      </Card>
    );
  }
  return null;
}
