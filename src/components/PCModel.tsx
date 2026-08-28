import { lazy, Suspense, useEffect, useState } from 'react'

// three.js and drei are 888 KB of the site's 1,141 KB of JavaScript. Nothing above the fold needs
// them, so the canvas is a separate chunk that only starts downloading once the browser is idle.
// Everything three-related lives in PCModelCanvas so this module stays free of those imports.
const PCModelCanvas = lazy(() => import('./PCModelCanvas'))

export default function PCModel() {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const idle = window.requestIdleCallback
        if (idle) {
            const handle = idle(() => setReady(true), { timeout: 2500 })
            return () => window.cancelIdleCallback?.(handle)
        }

        // Safari has no requestIdleCallback, so fall back to a short timer.
        const timer = window.setTimeout(() => setReady(true), 1200)
        return () => window.clearTimeout(timer)
    }, [])

    if (!ready) return <div className="w-full h-full" aria-hidden="true" />

    return (
        <Suspense fallback={<div className="w-full h-full" aria-hidden="true" />}>
            <PCModelCanvas />
        </Suspense>
    )
}
