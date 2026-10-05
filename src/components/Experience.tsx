import React from "react";
import PixelIcon from "./PixelIcon";

interface ExperienceItem {
  title: string;
  company: string;
  link?: string;
  period: string;
  description: string | string[];
  icon?: string;
  logo?: string;
  logoOnDark?: boolean;
  type: string;
}

// A role is current when its period has no end date. Both locales use their own word for it.
const isCurrent = (period: string) => /present|presente|actual/i.test(period);

interface ExperienceProps {
  experiences: ExperienceItem[];
}

const Experience: React.FC<ExperienceProps> = ({ experiences }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-1 bg-primary/30"></div>

        <div className="space-y-8">
          {experiences.map((experience, index) => {
            const current = isCurrent(experience.period);

            return (
            <div key={index} className="relative flex items-start gap-3 sm:gap-6">
              {/* Timeline dot. The logo links to the company, same as its name in the card. */}
              <div className="flex-shrink-0 relative z-10">
                {(() => {
                  const tile = `w-10 h-10 sm:w-12 sm:h-12 border-2 sm:border-4 border-text flex items-center justify-center relative overflow-hidden ${experience.logo ? experience.logoOnDark ? "bg-text" : "bg-white" : "bg-primary text-background"}`;
                  const face = experience.logo ? (
                    <img
                      src={experience.logo}
                      alt={experience.link ? "" : `${experience.company} logo`}
                      className={`w-full h-full object-contain ${experience.logoOnDark ? "p-0.5" : ""}`}
                    />
                  ) : (
                    <PixelIcon name={experience.icon ?? "briefcase"} className="w-5 h-5" />
                  );
                  return experience.link ? (
                    <a
                      href={experience.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={experience.company}
                      className={`press [--press:2px] sm:[--press:4px] ${tile}`}
                    >
                      {face}
                    </a>
                  ) : (
                    <div className={`${tile} shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] sm:shadow-[4px_4px_0px_0px_rgba(65,44,71,1)]`}>
                      {face}
                    </div>
                  );
                })()}
              </div>

              {/* Content */}
              <div className="flex-1 bg-background/80 backdrop-blur-sm border-2 sm:border-4 border-text shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] sm:shadow-[8px_8px_0px_0px_rgba(65,44,71,1)] p-4 sm:p-6 relative">
                {/* Decorative corner elements */}
                <div className="absolute top-0 left-0 w-6 h-6 border-r-4 border-b-4 border-text/30"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-l-4 border-t-4 border-text/30"></div>

                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <h3 className="text-base sm:text-xl font-ubuntu-mono text-primary font-bold text-center sm:text-left">
                      {experience.title}
                    </h3>
                    <span
                      className={`font-ubuntu-mono text-xs sm:text-sm px-3 py-1 border-2 mt-2 sm:mt-0 self-center sm:self-start whitespace-nowrap ${
                        current
                          ? "bg-primary text-background border-text font-bold"
                          : "text-text bg-primary/20 border-text/20"
                      }`}
                    >
                      {experience.period}
                    </span>
                  </div>

                  {experience.link ? (
                    <a
                      href={experience.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block sm:inline-block text-sm sm:text-lg font-open-sans text-text font-semibold mb-3 underline decoration-2 decoration-primary/50 underline-offset-4 hover:decoration-primary focus:decoration-primary transition-all duration-300 hover:text-primary sm:hover:translate-x-1 text-center sm:text-left"
                    >
                      {experience.company}
                    </a>
                  ) : (
                    <span className="block text-sm sm:text-lg font-open-sans text-text font-semibold mb-3 text-center sm:text-left">
                      {experience.company}
                    </span>
                  )}

                  <div className="flex flex-col gap-3">
                    {(Array.isArray(experience.description)
                      ? experience.description
                      : [experience.description]
                    ).map((line, i) => (
                      <p
                        key={i}
                        className="text-text font-open-sans text-sm sm:text-base leading-relaxed text-center sm:text-left"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Experience;
