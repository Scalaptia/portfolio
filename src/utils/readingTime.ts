export function getReadingTime(content: string | undefined): number {
    if (!content) return 1 // Default to 1 minute if no content

    const wordsPerMinute = 200
    const words = content.trim().split(/\s+/).length
    return Math.ceil(words / wordsPerMinute)
}
