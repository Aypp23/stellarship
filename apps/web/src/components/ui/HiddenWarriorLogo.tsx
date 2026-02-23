import React from 'react';

interface HiddenWarriorLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export const HiddenWarriorLogo: React.FC<HiddenWarriorLogoProps> = ({ className, ...props }) => {
    return (
        <svg
            viewBox="0 0 276 277"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M198 17.5H69V78.5H17.5V259.5H198V208H258.5V78.5H198V17.5Z"
                stroke="currentColor"
                strokeWidth="35"
            />
            <rect
                x="99.5"
                y="109.5"
                width="68"
                height="68"
                fill="currentColor"
            />
        </svg>
    );
};
