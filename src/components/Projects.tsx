import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { ImageCarousel } from "./ImageCarousel";

export interface Project {
    title: string;
    description: string[];
    image: string[];
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

    const onSwipedLeft = () =>
        setActiveIndex((prevIndex) =>
            prevIndex < projects.length - 1 ? prevIndex + 1 : 0
        );

    const onSwipedRight = () =>
        setActiveIndex((prevIndex) =>
            prevIndex > 0 ? prevIndex - 1 : projects.length - 1
        );

    const handlers = useSwipeable({
        onSwipedLeft,
        onSwipedRight,
    });

    return (
        <div className="flex w-full justify-center" {...handlers}>
            <button onClick={onSwipedRight} className="mr-10 text-5xl font-black-han-sans hidden lg:block">
                &lt;
            </button>

            <div className="w-full lg:w-10/12 h-full flex flex-col items-center justify-center text-text font-open-sans">
                <div className="flex flex-wrap mt-4 mb-2 md:pb-4">
                    {projects.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => handleIndicatorClick(index)}
                            className={`h-5 w-5 rounded-full transition-colors ${
                                index === activeIndex
                                    ? "bg-primary"
                                    : "bg-[#ADC7C6]"
                            } ml-2`}
                        />
                    ))}
                </div>

                {projects.map((project, index) => (
                    <div
                        key={index}
                        className={`flex flex-col lg:flex-row h-full ${
                            index !== activeIndex ? "hidden" : ""
                        } w-full relative gap-10 mb-12 items-center lg:items-start`}
                    >
                        <div className="flex flex-col w-full h-full items-center lg:items-start lg:w-1/2 lg:min-h-full gap-3 flex-grow">
                            {/* Title */}
                            <div className="w-full flex justify-between gap-1 items-center my-4">
                                <h2 className="text-[30px] lg:text-[40px] font-black-han-sans">
                                    {project.title}
                                </h2>
                                {project.repo ? (
                                    <a
                                        href={project.repo}
                                        target="_blank"
                                        className="h-8 px-2 mb-2 gap-2 flex items-center justify-center text-text bg-white rounded-lg"
                                    >
                                        <p className="font-black-han-sans font-extrabold text-sm">
                                            Code
                                        </p>
                                        <img
                                            src="/svg/link.svg"
                                            draggable="false"
                                        />
                                    </a>
                                ) : null}
                            </div>

                            {/* Description */}
                            <p className="mb-4 text-lg text-center lg:text-left sm:text-xl max-w-[50ch]">
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
                            <div className="lg:absolute flex bottom-0 flex-wrap gap-[10px] mt-auto justify-center">
                                {project.tags.map((tag, tagIndex) => (
                                    <span
                                        key={tagIndex}
                                        className="text-white bg-text rounded-full px-4 py-1 text-md font-ubuntu-mono font-extrabold"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Image */}
                        <div className="relative group bg-black rounded-xl overflow-hidden mt-4 sm:mt-0 max-w-[50ch] lg:min-w-[50ch] min-w-[90%]">
                            <ImageCarousel images={project.image} interval={5000} live={project.live} />
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={onSwipedLeft} className="ml-10 text-5xl font-black-han-sans hidden lg:block">
                &gt;
            </button>
        </div>
    );
}
