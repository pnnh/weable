type Props = {
    color: string;
    engineLabel: string;
    gameName: string;
};

export default function GameCoverPlaceholder({ color, engineLabel, gameName }: Props) {
    return (
        <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 select-none"
            style={{ backgroundColor: color }}
            aria-label={gameName}
        >
            {/* Game controller icon */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-10 h-10"
            >
                <rect x="2" y="6" width="20" height="12" rx="4" />
                <path d="M6 12h4M8 10v4" />
                <circle cx="16" cy="11" r="0.75" fill="rgba(255,255,255,0.6)" stroke="none" />
                <circle cx="18" cy="13" r="0.75" fill="rgba(255,255,255,0.6)" stroke="none" />
            </svg>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: "rgba(255,255,255,0.75)", backgroundColor: "rgba(0,0,0,0.25)" }}>
                {engineLabel}
            </span>
        </div>
    );
}
