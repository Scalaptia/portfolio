import { ExternalLink, Link } from "lucide-react";
import { ImageCarousel } from "./ImageCarousel";

interface ProjectsGridProps {
  projects: Project[];
  translations: {
    keyContributions: string;
    technologies: string;
  };
}

export default function ProjectsGrid({
  projects,
  translations,
}: ProjectsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-10 w-full">
      {projects.map((project, index) => (
        <div key={index} className="relative group">
          {/* Project number indicator */}
          <div className="absolute -top-4 -right-4 w-10 h-10 bg-primary border-4 border-text flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] font-black-han-sans text-lg text-text z-20">
            {index + 1}
          </div>{" "}
          {/* Main project container */}
          <div className="w-full bg-background/80 backdrop-blur-sm border-4 border-text shadow-[8px_8px_0px_0px_rgba(65,44,71,1)] relative overflow-hidden">
            {/* Decorative corner elements */}
            <div className="absolute top-0 left-0 w-6 h-6 border-r-4 border-b-4 border-text/30"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-l-4 border-t-4 border-text/30"></div>

            {/* Project Image Section - Top */}
            <div className="relative">
              {/* Image container */}
              <div className="p-6 pb-0">
                <div className="border-4 border-text overflow-hidden shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] relative z-10">
                  <ImageCarousel images={project.image} live={project.live} />
                </div>
              </div>
            </div>

            {/* Project Info Section - Bottom */}
            <div className="p-6 relative z-10">
              {/* Title and buttons */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-5">
                <div className="relative inline-block">
                  <h2 className="text-3xl font-black-han-sans text-text text-center sm:text-left leading-tight mb-1">
                    {project.title}
                  </h2>
                  {/* Title decoration */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary opacity-50"></div>

                  {/* Context badge */}
                  {project.context && (
                    <div className="mt-3">
                      <span className="inline-block text-text/70 font-ubuntu-mono text-xs font-semibold px-3 py-1 border-2 border-text/30 bg-primary/10">
                        {project.context}
                      </span>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 justify-center sm:justify-end flex-shrink-0">
                  {project.live && (
                    <a
                      href={project.live}
                      target="_blank"
                      className="flex items-center justify-center gap-2 px-4 py-2 text-text border-2 border-text bg-white shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] transition-all duration-150 hover:shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] hover:translate-x-[1px] hover:translate-y-[1px]"
                    >
                      <span className="font-black-han-sans font-extrabold text-sm">
                        Demo
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {project.repo && (
                    <a
                      href={project.repo}
                      target="_blank"
                      className="flex items-center justify-center gap-2 px-4 py-2 text-text border-2 border-text bg-white shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] transition-all duration-150 hover:shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] hover:translate-x-[1px] hover:translate-y-[1px]"
                    >
                      <span className="font-black-han-sans font-extrabold text-sm">
                        Code
                      </span>
                      <Link className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              {/* Project Description */}
              <div className="mb-6">
                <p className="text-text text-lg leading-relaxed text-center sm:text-left font-open-sans">
                  {project.description}
                </p>
              </div>{" "}
              {/* Contributions - Simplified styling */}
              <div className="mb-6">
                <h3 className="text-primary font-ubuntu-mono text-sm font-bold mb-3 uppercase tracking-wide">
                  {translations.keyContributions}
                </h3>
                <div className="border-l-4 border-primary pl-4 py-2 bg-primary/5">
                  <ul className="text-text space-y-2">
                    {project.contributions.map((contribution, i) => (
                      <li
                        key={i}
                        className="text-base list-none relative pl-5 font-open-sans"
                      >
                        <span className="absolute left-0 top-2 w-2 h-2 bg-primary border border-text rotate-45"></span>
                        {contribution}.
                      </li>
                    ))}
                  </ul>
                </div>
              </div>{" "}
              {/* Technologies - Simplified styling */}
              <div>
                <h3 className="text-primary font-ubuntu-mono text-sm font-bold mb-3 uppercase tracking-wide">
                  {translations.technologies}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag: String, tagIndex: number) => (
                    <span
                      key={tagIndex}
                      className="text-white bg-text border-2 border-white px-3 py-1 text-sm font-ubuntu-mono font-extrabold shadow-[2px_2px_0px_0px_rgba(253,141,117,0.6)] transition-all duration-150 hover:shadow-[3px_3px_0px_0px_rgba(253,141,117,0.8)] hover:-translate-x-[1px] hover:-translate-y-[1px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
