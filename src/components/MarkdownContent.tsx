import sanitizeHtml from "sanitize-html";
import { marked } from "marked";

interface Props {
    content: string;
}

export default function MarkdownContent({ content }: Props) {
    const rawHtml = marked.parse(content, { async: false }) as string;
    const cleanHtml = sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ["src", "alt", "title", "width", "height"],
        },
    });

    return (
        <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
    );
}
