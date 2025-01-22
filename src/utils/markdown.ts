import { marked } from 'marked'

// Function to convert markdown to HTML
export const parseMarkdown = (text: string) => {
    return marked.parseInline(text)
}
