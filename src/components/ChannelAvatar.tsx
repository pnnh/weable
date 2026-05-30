"use client";

interface Props {
    channelId: string;
    channelName: string;
    size?: number;
}

export default function ChannelAvatar({ channelId, channelName, size = 40 }: Props) {
    const firstChar = channelName.charAt(0).toUpperCase();

    return (
        <div
            className="rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ width: size, height: size }}
        >
            <img
                src={`/api/channel/avatar/${channelId}`}
                alt={channelName}
                className="w-full h-full object-cover"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
            />
            <span className="hidden text-sm font-bold text-gray-500">{firstChar}</span>
        </div>
    );
}
