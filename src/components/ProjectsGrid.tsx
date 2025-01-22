import { ExternalLink, Link } from 'lucide-react'
import { ImageCarousel } from './ImageCarousel'

export default function ProjectsGrid({ projects }: { projects: Project[] }) {
    return (
        <div className="grid grid-cols-1 gap-8 w-full">
            {projects.map((project, index) => (
                <div
                    key={index}
                    className="flex flex-col bg-slate-100/20 rounded-none p-6 lg:flex lg:flex-row lg:gap-8 lg:items-center"
                >
                    {/* Project Image */}
                    <div className="relative group border-2 border-text rounded-none overflow-hidden w-full lg:w-1/2">
                        <ImageCarousel
                            images={project.image}
                            live={project.live}
                        />
                    </div>

                    {/* Project Info */}
                    <div className="flex flex-col flex-grow mt-4 lg:mt-0 w-full lg:w-1/2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:align-middle mb-4 gap-2">
                            {/* Title */}
                            <h2 className="text-[30px] font-black-han-sans text-text text-center md:text-left">
                                {project.title}
                            </h2>

                            {/* Buttons */}
                            <div className="flex gap-2 justify-center md:justify-end">
                                {project.live && (
                                    <a
                                        href={project.live}
                                        target="_blank"
                                        className="h-8 px-4 gap-2 flex items-center justify-center text-text border-2 border-text bg-white shadow-[2px_2px_0px_0px_rgba(65,44,71,1)]"
                                    >
                                        <p className="font-black-han-sans font-extrabold text-sm mt-[3px]">
                                            Demo
                                        </p>
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                                {project.repo && (
                                    <a
                                        href={project.repo}
                                        target="_blank"
                                        className="h-8 px-4 gap-2 flex items-center justify-center text-text border-2 border-text bg-white shadow-[2px_2px_0px_0px_rgba(65,44,71,1)]"
                                    >
                                        <p className="font-black-han-sans font-extrabold text-sm mt-[3px]">
                                            Code
                                        </p>
                                        <Link className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Project Description */}
                        <p className="text-text text-lg text-center lg:text-left">
                            {project.description}
                        </p>

                        {/* Contributions */}
                        <div className="mt-6 border-l-4 border-primary pl-4 mb-6">
                            <ul className="text-text space-y-4">
                                {project.contributions.map(
                                    (contribution, i) => (
                                        <li
                                            key={i}
                                            className="text-lg list-none"
                                        >
                                            {contribution}.
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 justify-center mt-auto lg:justify-start">
                            {project.tags.map(
                                (tag: String, tagIndex: number) => (
                                    <span
                                        key={tagIndex}
                                        className="text-white bg-text border-2 border-white px-4 py-1 text-sm font-ubuntu-mono font-extrabold"
                                    >
                                        {tag}
                                    </span>
                                )
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
