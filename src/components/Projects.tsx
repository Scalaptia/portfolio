import React, { useState } from "react";

export interface Project {
    title: string;
    description: string[];
    image: string;
    tags: string[];
    repo?: string;
    live?: string;
}

export interface ProjectsProps {
    projects: Project[];
}

export function Projects({ projects }: ProjectsProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    const handleIndicatorClick = (index: number) => {
        setActiveIndex(index);
    };

    return (
        <div className="flex w-full justify-center">
            <div className="w-10/12 h-full flex flex-col items-center justify-center text-text font-open-sans">
                {projects.map((project, index) => (
                    <div
                        key={index}
                        className={`flex h-full ${
                            index !== activeIndex ? "hidden" : ""
                        } w-full gap-10`}
                    >
                        <div className="flex flex-col w-1/2 gap-3">
                            {/* Title */}
                            <div className="w-full flex justify-between">
                                <h2 className="text-[40px] font-black-han-sans font-extrabold">
                                    {project.title}
                                </h2>
                                {project.repo ? (
                                    <a
                                        href={project.repo}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#ADC7C6] text-sm"
                                    >
                                        View Repository
                                    </a>
                                ) : null}
                            </div>

                            {/* Description */}
                            <p className="mb-4 text-xl max-w-[50ch]">
                                {project.description.map((paragraph, index) => (
                                    <span key={index}>
                                        {paragraph}
                                        {index !==
                                            project.description.length - 1 && (
                                            <>
                                                <br />
                                                <br />
                                            </>
                                        )}
                                    </span>
                                ))}
                            </p>

                            {/* Tags */}
                            {/* Go to the end */}
                            <div className="flex flex-wrap gap-[10px] mt-auto">
                                {project.tags.map((tag, tagIndex) => (
                                    <span
                                        key={tagIndex}
                                        className="text-white bg-text rounded-full px-3 py-2 text-sm font-black-han-sans font-extrabold"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Image */}
                        <div>
                            <img
                                src={project.image}
                                alt={project.title}
                                className="object-cover w-full rounded-xl h-[332px]"
                            />
                        </div>
                    </div>
                ))}
                <div className="flex mt-4">
                    {projects.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => handleIndicatorClick(index)}
                            className={`h-5 w-5 rounded-full mt-12 transition-colors ${
                                index === activeIndex
                                    ? "bg-primary"
                                    : "bg-[#ADC7C6]"
                            } ml-2`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
