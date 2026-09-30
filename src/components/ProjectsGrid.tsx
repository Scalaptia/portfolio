import type { FocusEvent } from "react";
import { MediaGallery } from "./MediaGallery";
import PixelIcon from "./PixelIcon";
import "@/styles/project-preview.css";

interface ProjectsGridProps {
  projects: Project[];
  translations: { technologies: string; swipeHint?: string; readMore: string };
  locale: string;
}

function signalProject(project: Project, hovered: boolean) {
  window.dispatchEvent(
    new CustomEvent("pageInteraction", {
      detail: { type: "project", hovered, title: project.title },
    }),
  );
}

export default function ProjectsGrid({
  projects,
  translations,
  locale,
}: ProjectsGridProps) {
  return (
    <div className="project-exhibits">
      {projects.map((project, index) => {
        const phone = project.slug === "stilo";
        const theme = phone
          ? "wardrobe"
          : project.slug === "nasa-explorer"
            ? "space"
            : "water";
        const number = String(index + 1).padStart(2, "0");
        const images = project.image.map((src, imageIndex) => ({
          type: "image" as const,
          src: phone ? src.replace(".webp", "-cropped.webp") : src,
          alt: `${project.title} ${locale === "es" ? "pantalla" : "screen"} ${imageIndex + 1}`,
        }));
        return (
          <article
            key={project.slug ?? project.title}
            className={`project-exhibit project-exhibit--${theme}`}
            aria-labelledby={`project-${index}`}
            onMouseEnter={() => signalProject(project, true)}
            onMouseLeave={() => signalProject(project, false)}
            onFocus={() => signalProject(project, true)}
            onBlur={(event: FocusEvent<HTMLElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                signalProject(project, false);
            }}
          >
            <div className="project-stage">
              <div className="project-stage-label" aria-hidden="true">
                <span>
                  {number} / {project.title.toLowerCase().replaceAll(" ", "_")}
                </span>
                <span className="project-status-light" />
              </div>
              {phone ? (
                <div className="project-phones">
                  {images[1] && (
                    <img
                      className="project-phone-back"
                      src={images[1].src}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                    />
                  )}
                  <div className="project-phone-front">
                    <MediaGallery
                      items={images}
                      mode="carousel"
                      swipeHint={translations.swipeHint}
                      viewportClassName="project-phone-screen"
                    />
                  </div>
                </div>
              ) : (
                <div className="project-browser">
                  <div className="project-browser-bar" aria-hidden="true">
                    <span className="project-window-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      {project.title.toLowerCase().replaceAll(" ", "_")}.app
                    </span>
                    <PixelIcon name="maximize" className="w-3 h-3" />
                  </div>
                  <MediaGallery
                    items={images}
                    mode="carousel"
                    swipeHint={translations.swipeHint}
                    viewportClassName="project-browser-screen"
                  />
                </div>
              )}
              <span className="project-stage-caption" aria-hidden="true">
                {phone ? "mobile" : "web"} / {number}
              </span>
            </div>
            <div className="project-copy">
              <span className="project-index" aria-hidden="true">
                {number}
              </span>
              {project.context && (
                <p className="project-context">{project.context}</p>
              )}
              <h2 id={`project-${index}`} className="project-title">
                {project.title}
              </h2>
              <p className="project-description">{project.description}</p>
              <ul
                className="project-stack"
                aria-label={translations.technologies}
              >
                {project.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              <div className="project-actions">
                {project.slug && (
                  <a
                    className="project-main-link press [--press:3px]"
                    href={`${locale === "es" ? "/es" : ""}/projects/${project.slug}`}
                  >
                    {translations.readMore}
                    <PixelIcon name="arrow-right" className="w-4 h-4" />
                  </a>
                )}
                {project.live && (
                  <a
                    className="project-secondary-link"
                    href={project.live}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Demo
                    <PixelIcon name="external-link" className="w-4 h-4" />
                  </a>
                )}
                {project.repo && (
                  <a
                    className="project-secondary-link"
                    href={project.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Code
                    <PixelIcon name="link" className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
