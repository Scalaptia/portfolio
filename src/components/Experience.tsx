import React from "react";
import { Briefcase, GraduationCap, Users } from "lucide-react";

interface ExperienceItem {
  title: string;
  company: string;
  link?: string;
  period: string;
  description: string;
  type: string;
}

interface ExperienceProps {
  experiences: ExperienceItem[];
}

const Experience: React.FC<ExperienceProps> = ({ experiences }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "work":
        return <Briefcase className="w-5 h-5" />;
      case "education":
        return <GraduationCap className="w-5 h-5" />;
      case "leadership":
        return <Users className="w-5 h-5" />;
      default:
        return <Briefcase className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-1 bg-primary/30"></div>

        <div className="space-y-8">
          {experiences.map((experience, index) => (
            <div key={index} className="relative flex items-start gap-6">
              {/* Timeline dot */}
              <div className="flex-shrink-0 w-12 h-12 bg-primary border-4 border-text shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] flex items-center justify-center text-background relative z-10">
                {getIcon(experience.type)}
              </div>

              {/* Content */}
              <div className="flex-1 bg-background/80 backdrop-blur-sm border-4 border-text shadow-[8px_8px_0px_0px_rgba(65,44,71,1)] p-6 relative">
                {/* Decorative corner elements */}
                <div className="absolute top-0 left-0 w-6 h-6 border-r-4 border-b-4 border-text/30"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-l-4 border-t-4 border-text/30"></div>

                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <h3 className="text-xl font-ubuntu-mono text-primary font-bold">
                      {experience.title}
                    </h3>
                    <span className="text-text font-ubuntu-mono text-sm bg-primary/20 px-3 py-1 border-2 border-text/20 mt-2 sm:mt-0 self-start">
                      {experience.period}
                    </span>
                  </div>

                  {experience.link ? (
                    <a
                      href={experience.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-open-sans text-text font-semibold mb-3 hover:underline focus:underline transition-all duration-300 hover:text-primary hover:translate-x-1 inline-block"
                    >
                      {experience.company}
                    </a>
                  ) : (
                    <span className="text-lg font-open-sans text-text font-semibold mb-3">
                      {experience.company}
                    </span>
                  )}

                  <p className="text-text font-open-sans leading-relaxed">
                    {experience.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Experience;
